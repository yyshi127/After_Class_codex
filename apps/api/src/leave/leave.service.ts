import { Injectable } from "@nestjs/common";
import { AccessService } from "../access/access.service";
import type { AuthenticatedUser } from "../auth/types";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLeaveRequestDto } from "./dto/create-leave-request.dto";

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: AccessService,
    private readonly notificationsService: NotificationsService,
  ) {}

  list(user: AuthenticatedUser, campusId?: string, studentId?: string) {
    return this.prisma.leaveRequest.findMany({
      where: {
        student: this.accessService.buildStudentScopeWhere(user, { campusId, studentId }),
      },
      include: {
        student: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async create(user: AuthenticatedUser, dto: CreateLeaveRequestDto) {
    const student = await this.accessService.findAccessibleStudent(user, dto.studentId);
    const leave = await this.prisma.leaveRequest.create({
      data: {
        campusId: student.campusId,
        studentId: student.id,
        type: dto.type,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        reason: dto.reason,
        mealAffected: dto.mealAffected,
      },
      include: {
        student: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
      },
    });

    await this.notificationsService.createForStudentTeachers({
      studentId: student.id,
      title: "请假申请待确认",
      content: `${student.name} 提交了${dto.type}申请，时间 ${leave.startsAt.toLocaleString("zh-CN")} 至 ${leave.endsAt.toLocaleString("zh-CN")}。`,
    });

    return leave;
  }
}
