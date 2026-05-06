import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AiRiskLevel, AttendanceStatus, UserRole } from "@prisma/client";
import { createIntentRecognitionProvider } from "@afterclass/ai";
import { AccessService } from "../access/access.service";
import type { AuthenticatedUser } from "../auth/types";
import { PrismaService } from "../prisma/prisma.service";
import { ConfirmTeacherQuickEntryDto } from "./dto/confirm-teacher-quick-entry.dto";
import { RecognizeIntentDto } from "./dto/recognize-intent.dto";

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly accessService: AccessService,
  ) {}

  async recognizeIntent(user: AuthenticatedUser, dto: RecognizeIntentDto) {
    const provider = createIntentRecognitionProvider(this.config.get<string>("AI_PROVIDER") ?? "mock");
    const startedAt = Date.now();
    const result = await provider.recognize(dto.input, { timeoutMs: 1500 });
    const campusId = dto.campusId && user.campusIds.includes(dto.campusId) ? dto.campusId : user.campusIds[0] ?? null;
    const promptTokenCount = this.estimateTokenCount(dto.input);
    const completionTokenCount = this.estimateTokenCount(JSON.stringify(result));

    const log = await this.prisma.aiActionLog.create({
      data: {
        campusId,
        actorUserId: user.id,
        rawInput: dto.input,
        intent: result.intent,
        entities: {
          ...result.entities,
          latencyMs: Date.now() - startedAt,
          refusalReason: result.refusalReason,
        },
        riskLevel: result.riskLevel as AiRiskLevel,
        confidence: result.confidence,
        promptTokenCount,
        completionTokenCount,
        totalTokenCount: promptTokenCount + completionTokenCount,
        costCents: 0,
        requiresConfirmation: result.requiresConfirmation,
        result: result.refusalReason ?? "intent_recognized",
      },
    });

    return {
      ...result,
      logId: log.id,
    };
  }

  async confirmTeacherQuickEntry(user: AuthenticatedUser, dto: ConfirmTeacherQuickEntryDto) {
    if (user.role !== UserRole.admin && user.role !== UserRole.teacher) {
      throw new ForbiddenException("Only staff can confirm teacher quick entry");
    }

    const log = await this.prisma.aiActionLog.findFirst({
      where: {
        id: dto.logId,
        actorUserId: user.id,
      },
    });
    if (!log || log.intent !== "teacher_attendance_quick_entry") {
      throw new NotFoundException("AI quick entry log not found");
    }
    if (log.riskLevel === AiRiskLevel.high) {
      throw new BadRequestException("High risk AI actions cannot be executed directly");
    }
    if (log.riskLevel === AiRiskLevel.medium && !dto.secondConfirmed) {
      throw new BadRequestException("Medium risk AI actions require second confirmation");
    }

    const student = await this.accessService.findAccessibleStudent(user, dto.studentId);
    const statusMap = {
      check_in: AttendanceStatus.checked_in,
      leave: AttendanceStatus.leave,
      absent: AttendanceStatus.absent,
    } as const;
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const attendance = await tx.attendanceRecord.create({
        data: {
          campusId: student.campusId,
          studentId: student.id,
          status: statusMap[dto.action],
          occurredAt,
        },
      });

      await tx.aiActionLog.update({
        where: { id: log.id },
        data: {
          confirmedByUserId: user.id,
          confirmedAt: new Date(),
          result: `teacher_quick_entry_executed:${dto.action}`,
        },
      });

      await tx.auditLog.create({
        data: {
          campusId: student.campusId,
          actorUserId: user.id,
          action: "ai.teacher_quick_entry.confirm",
          targetType: "attendance_record",
          targetId: attendance.id,
          metadata: {
            aiActionLogId: log.id,
            studentId: student.id,
            action: dto.action,
            secondConfirmed: Boolean(dto.secondConfirmed),
          },
        },
      });

      return attendance;
    });
  }

  private estimateTokenCount(text: string) {
    return Math.max(1, Math.ceil(text.length / 4));
  }
}
