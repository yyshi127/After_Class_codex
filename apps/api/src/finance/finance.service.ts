import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AttendanceStatus, BillingStatus, ClassSettlementStatus, UserRole } from "@prisma/client";
import { AccessService } from "../access/access.service";
import type { AuthenticatedUser } from "../auth/types";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBillingRecordDto } from "./dto/create-billing-record.dto";
import { GenerateClassSettlementDto } from "./dto/generate-class-settlement.dto";
import { RunServiceRemindersDto, ServiceReminderMode } from "./dto/run-service-reminders.dto";
import { UpsertTeacherFeeConfigDto } from "./dto/upsert-teacher-fee-config.dto";

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: AccessService,
    private readonly notificationsService: NotificationsService,
  ) {}

  listBillingRecords(user: AuthenticatedUser, campusId?: string, studentId?: string) {
    this.assertStaff(user);
    const campusIds = campusId ? [campusId] : user.campusIds;
    if (campusId) this.accessService.assertCampusAccess(user, campusId);

    return this.prisma.billingRecord.findMany({
      where: {
        campusId: { in: campusIds },
        studentId: studentId || undefined,
        student: user.role === UserRole.teacher ? this.accessService.buildStudentScopeWhere(user, { campusId, studentId }) : undefined,
      },
      include: {
        student: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
        serviceType: { select: { id: true, code: true, name: true } },
      },
      orderBy: { periodEnd: "desc" },
      take: 100,
    });
  }

  async createBillingRecord(user: AuthenticatedUser, dto: CreateBillingRecordDto) {
    this.assertStaff(user);
    this.accessService.assertCampusAccess(user, dto.campusId);
    const student = await this.accessService.findAccessibleStudent(user, dto.studentId);
    if (student.campusId !== dto.campusId) {
      throw new ForbiddenException("Student does not belong to this campus");
    }

    const balanceCents = Math.max(dto.amountDueCents - dto.amountPaidCents, 0);
    const status = this.getBillingStatus(dto.amountDueCents, dto.amountPaidCents);

    return this.prisma.billingRecord.create({
      data: {
        campusId: dto.campusId,
        studentId: dto.studentId,
        serviceTypeId: dto.serviceTypeId,
        billingCycle: dto.billingCycle,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        amountDueCents: dto.amountDueCents,
        amountPaidCents: dto.amountPaidCents,
        balanceCents,
        status,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
        note: dto.note,
      },
    });
  }

  async getServiceSummary(user: AuthenticatedUser, studentId: string) {
    const student = await this.accessService.findAccessibleStudent(user, studentId);
    const service = await this.prisma.studentService.findFirst({
      where: { studentId: student.id },
      include: { serviceType: { select: { code: true, name: true } } },
      orderBy: { validTo: "desc" },
    });

    return {
      studentId: student.id,
      studentName: student.name,
      serviceType: service?.serviceType ?? null,
      validFrom: service?.validFrom ?? null,
      validTo: service?.validTo ?? null,
      renewHint: service ? this.buildRenewHint(service.validTo) : "暂无服务有效期，请联系机构确认。",
    };
  }

  async sendOverdueServiceReminder(user: AuthenticatedUser, studentId: string) {
    this.assertStaff(user);
    const student = await this.accessService.findAccessibleStudent(user, studentId);
    const service = await this.prisma.studentService.findFirst({
      where: { studentId: student.id },
      include: { serviceType: { select: { name: true } } },
      orderBy: { validTo: "desc" },
    });

    if (!service) {
      throw new NotFoundException("Student service not found");
    }
    if (service.validTo.getTime() >= Date.now()) {
      throw new BadRequestException("Service has not expired yet");
    }

    const validToDate = service.validTo.toISOString().slice(0, 10);
    await this.notificationsService.createForStudentGuardians({
      studentId: student.id,
      title: "服务逾期提醒",
      content: `${student.name} 的${service.serviceType.name}已于 ${validToDate} 到期，请尽快联系老师续费。`,
    });

    return {
      studentId: student.id,
      studentName: student.name,
      validTo: service.validTo,
      notifiedAt: new Date(),
    };
  }

  async runServiceReminders(user: AuthenticatedUser, dto: RunServiceRemindersDto) {
    this.assertAdmin(user);
    this.accessService.assertCampusAccess(user, dto.campusId);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const targetStart = new Date(todayStart);
    if (dto.mode === ServiceReminderMode.upcoming) {
      targetStart.setDate(targetStart.getDate() + (dto.daysBefore ?? 7));
    }
    const targetEnd = new Date(targetStart);
    targetEnd.setDate(targetEnd.getDate() + 1);

    const services = await this.prisma.studentService.findMany({
      where: {
        student: {
          campusId: dto.campusId,
          status: "active",
        },
        validTo: {
          gte: targetStart,
          lt: targetEnd,
        },
      },
      include: {
        student: { select: { id: true, name: true } },
        serviceType: { select: { name: true } },
      },
      take: 200,
    });

    let createdCount = 0;
    for (const service of services) {
      const title = dto.mode === ServiceReminderMode.today ? "服务今日到期提醒" : "服务即将到期提醒";
      const existing = await this.prisma.notification.findFirst({
        where: {
          studentId: service.studentId,
          title,
          createdAt: { gte: todayStart },
        },
        select: { id: true },
      });
      if (existing) {
        continue;
      }

      await this.notificationsService.createForStudentGuardians({
        studentId: service.studentId,
        title,
        content: `${service.student.name} 的${service.serviceType.name}有效期至 ${service.validTo.toISOString().slice(0, 10)}，如需续费请联系机构老师。`,
      });
      createdCount += 1;
    }

    return {
      campusId: dto.campusId,
      mode: dto.mode,
      scannedCount: services.length,
      createdCount,
    };
  }

  async upsertTeacherFeeConfig(user: AuthenticatedUser, dto: UpsertTeacherFeeConfigDto) {
    this.assertAdmin(user);
    this.accessService.assertCampusAccess(user, dto.campusId);

    return this.prisma.teacherFeeConfig.create({
      data: {
        campusId: dto.campusId,
        teacherId: dto.teacherId,
        classId: dto.classId,
        feePerAttendCents: dto.feePerAttendCents,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      },
    });
  }

  listClassSettlements(user: AuthenticatedUser, campusId?: string, classId?: string, periodStart?: string, periodEnd?: string) {
    this.assertAdmin(user);
    const campusIds = campusId ? [campusId] : user.campusIds;
    if (campusId) this.accessService.assertCampusAccess(user, campusId);

    return this.prisma.classSettlement.findMany({
      where: {
        campusId: { in: campusIds },
        classId: classId || undefined,
        periodStart: periodStart ? { gte: new Date(periodStart) } : undefined,
        periodEnd: periodEnd ? { lte: new Date(periodEnd) } : undefined,
      },
      include: {
        class: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
      },
      orderBy: { periodEnd: "desc" },
      take: 100,
    });
  }

  async generateClassSettlement(user: AuthenticatedUser, dto: GenerateClassSettlementDto) {
    this.assertAdmin(user);
    this.accessService.assertCampusAccess(user, dto.campusId);
    const classRow = await this.prisma.class.findFirst({ where: { id: dto.classId, campusId: dto.campusId } });
    if (!classRow) throw new NotFoundException("Class not found");

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    const studentAttendCount = await this.prisma.attendanceRecord.count({
      where: {
        campusId: dto.campusId,
        status: AttendanceStatus.checked_in,
        occurredAt: { gte: periodStart, lte: periodEnd },
        student: { classId: dto.classId },
      },
    });
    const income = await this.prisma.billingRecord.aggregate({
      where: {
        campusId: dto.campusId,
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
        student: { classId: dto.classId },
      },
      _sum: { amountPaidCents: true },
    });

    const teacherId = dto.teacherId ?? (await this.findClassTeacherId(dto.classId));
    const feeConfig = teacherId
      ? await this.prisma.teacherFeeConfig.findFirst({
          where: {
            campusId: dto.campusId,
            teacherId,
            AND: [
              { OR: [{ classId: dto.classId }, { classId: null }] },
              { effectiveFrom: { lte: periodEnd } },
              { OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodStart } }] },
            ],
          },
          orderBy: { effectiveFrom: "desc" },
        })
      : null;
    const teacherFeeCents = (feeConfig?.feePerAttendCents ?? 0) * studentAttendCount;
    const incomeCents = income._sum.amountPaidCents ?? 0;

    return this.prisma.classSettlement.create({
      data: {
        campusId: dto.campusId,
        classId: dto.classId,
        teacherId,
        periodStart,
        periodEnd,
        studentAttendCount,
        incomeCents,
        teacherFeeCents,
        grossProfitCents: incomeCents - teacherFeeCents,
        status: ClassSettlementStatus.draft,
      },
    });
  }

  private async findClassTeacherId(classId: string) {
    const binding = await this.prisma.teacherClass.findFirst({
      where: { classId },
      orderBy: { createdAt: "asc" },
    });
    return binding?.teacherId;
  }

  private getBillingStatus(amountDueCents: number, amountPaidCents: number) {
    if (amountPaidCents <= 0) return BillingStatus.unpaid;
    if (amountPaidCents < amountDueCents) return BillingStatus.partial;
    return BillingStatus.paid;
  }

  private buildRenewHint(validTo: Date) {
    const daysLeft = Math.ceil((validTo.getTime() - Date.now()) / 86_400_000);
    if (daysLeft < 0) return "服务已到期，请联系机构续费。";
    if (daysLeft <= 7) return `服务即将到期，有效期至 ${validTo.toISOString().slice(0, 10)}。`;
    return `当前服务有效期至 ${validTo.toISOString().slice(0, 10)}。`;
  }

  private assertStaff(user: AuthenticatedUser) {
    if (user.role !== UserRole.admin && user.role !== UserRole.teacher) {
      throw new ForbiddenException("Only staff can access billing records");
    }
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (user.role !== UserRole.admin) {
      throw new ForbiddenException("Only admin can access class settlements");
    }
  }
}
