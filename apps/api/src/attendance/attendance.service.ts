import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AttendanceStatus, TeacherAttendanceStatus, UserRole } from "@prisma/client";
import { AccessService } from "../access/access.service";
import type { AuthenticatedUser } from "../auth/types";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { ManualStudentAttendanceDto } from "./dto/manual-student-attendance.dto";
import { ManualTeacherAttendanceDto } from "./dto/manual-teacher-attendance.dto";
import { StudentCheckInDto } from "./dto/student-check-in.dto";
import { TeacherAttendanceDto } from "./dto/teacher-attendance.dto";

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: AccessService,
    private readonly notificationsService: NotificationsService,
  ) {}

  listStudentAttendance(
    user: AuthenticatedUser,
    campusId?: string,
    studentId?: string,
    classId?: string,
    serviceTypeId?: string,
  ) {
    const studentWhere = this.accessService.buildStudentScopeWhere(user, { campusId, classId, studentId });
    if (serviceTypeId) {
      studentWhere.services = {
        some: {
          serviceTypeId,
          validTo: { gte: new Date() },
        },
      };
    }

    return this.prisma.attendanceRecord.findMany({
      where: {
        student: studentWhere,
      },
      include: {
        student: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
      },
      orderBy: { occurredAt: "desc" },
      take: 100,
    });
  }

  async checkInStudent(user: AuthenticatedUser, dto: StudentCheckInDto) {
    if (user.role !== UserRole.admin && user.role !== UserRole.teacher) {
      throw new ForbiddenException("Only admin or teacher can check in students");
    }

    const student = await this.prisma.student.findFirst({
      where: this.accessService.buildStudentScopeWhere(user, { studentId: dto.studentId }),
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }

    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    const record = await this.prisma.attendanceRecord.create({
      data: {
        campusId: student.campusId,
        studentId: student.id,
        status: AttendanceStatus.checked_in,
        photoUrl: dto.photoUrl,
        occurredAt,
      },
    });

    await this.notificationsService.createForStudentGuardians({
      studentId: student.id,
      title: "孩子已到校",
      content: `${student.name} 已于 ${occurredAt.toLocaleString("zh-CN")} 到达托管校区。`,
    });

    return record;
  }

  async manualStudentAttendance(user: AuthenticatedUser, dto: ManualStudentAttendanceDto) {
    if (user.role !== UserRole.admin) {
      throw new ForbiddenException("Only admin can manually adjust student attendance");
    }

    const student = await this.accessService.findAccessibleStudent(user, dto.studentId);
    const occurredAt = new Date(dto.occurredAt);
    const record = await this.prisma.attendanceRecord.create({
      data: {
        campusId: student.campusId,
        studentId: student.id,
        status: dto.status,
        photoUrl: dto.photoUrl,
        occurredAt,
      },
      include: {
        student: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        campusId: student.campusId,
        actorUserId: user.id,
        action: "attendance.student_manual_record",
        targetType: "attendance_record",
        targetId: record.id,
        metadata: {
          studentId: student.id,
          status: dto.status,
          occurredAt: occurredAt.toISOString(),
        },
      },
    });

    return record;
  }

  listTeacherAttendance(user: AuthenticatedUser, campusId?: string) {
    const campusIds = campusId ? [campusId] : user.campusIds;
    if (campusId) {
      this.accessService.assertCampusAccess(user, campusId);
    }

    return this.prisma.teacherAttendance.findMany({
      where: {
        campusId: { in: campusIds },
        teacherId: user.role === UserRole.teacher ? user.id : undefined,
      },
      include: {
        teacher: { select: { id: true, name: true, phone: true } },
        campus: { select: { id: true, name: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 100,
    });
  }

  teacherCheckIn(user: AuthenticatedUser, dto: TeacherAttendanceDto) {
    return this.createTeacherAttendance(user, dto, TeacherAttendanceStatus.checked_in);
  }

  teacherCheckOut(user: AuthenticatedUser, dto: TeacherAttendanceDto) {
    return this.createTeacherAttendance(user, dto, TeacherAttendanceStatus.checked_out);
  }

  async manualTeacherAttendance(user: AuthenticatedUser, dto: ManualTeacherAttendanceDto) {
    if (user.role !== UserRole.admin) {
      throw new ForbiddenException("Only admin can manually adjust teacher attendance");
    }

    this.accessService.assertCampusAccess(user, dto.campusId);
    const teacher = await this.prisma.user.findFirst({
      where: {
        id: dto.teacherId,
        role: UserRole.teacher,
        campusAccess: {
          some: {
            campusId: dto.campusId,
          },
        },
      },
      select: { id: true },
    });
    if (!teacher) {
      throw new NotFoundException("Teacher not found");
    }

    const occurredAt = new Date(dto.occurredAt);
    const record = await this.prisma.teacherAttendance.create({
      data: {
        campusId: dto.campusId,
        teacherId: teacher.id,
        status: dto.status,
        occurredAt,
        note: dto.note,
      },
      include: {
        teacher: { select: { id: true, name: true, phone: true } },
        campus: { select: { id: true, name: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        campusId: dto.campusId,
        actorUserId: user.id,
        action: "attendance.teacher_manual_record",
        targetType: "teacher_attendance",
        targetId: record.id,
        metadata: {
          teacherId: teacher.id,
          status: dto.status,
          occurredAt: occurredAt.toISOString(),
        },
      },
    });

    return record;
  }

  private createTeacherAttendance(user: AuthenticatedUser, dto: TeacherAttendanceDto, status: TeacherAttendanceStatus) {
    if (user.role !== UserRole.teacher && user.role !== UserRole.admin) {
      throw new ForbiddenException("Only admin or teacher can record teacher attendance");
    }

    this.accessService.assertCampusAccess(user, dto.campusId);
    return this.prisma.teacherAttendance.create({
      data: {
        campusId: dto.campusId,
        teacherId: user.id,
        status,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
        note: dto.note,
      },
    });
  }
}
