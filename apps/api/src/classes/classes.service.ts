import { Injectable, NotFoundException } from "@nestjs/common";
import { AttendanceStatus, UserRole } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/types";
import { AccessService } from "../access/access.service";
import { PrismaService } from "../prisma/prisma.service";
import { AssignClassTeacherDto } from "./dto/assign-class-teacher.dto";
import { CreateClassDto } from "./dto/create-class.dto";
import { UpdateClassDto } from "./dto/update-class.dto";

@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: AccessService,
  ) {}

  async list(user: AuthenticatedUser, campusId?: string) {
    const campusIds = campusId ? [campusId] : user.campusIds;
    if (campusId) {
      this.accessService.assertCampusAccess(user, campusId);
    }
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const classes = await this.prisma.class.findMany({
      where: { campusId: { in: campusIds } },
      select: {
        id: true,
        campusId: true,
        name: true,
        campus: { select: { id: true, name: true } },
        teachers: {
          select: {
            teacher: { select: { id: true, name: true, phone: true } },
          },
        },
        _count: { select: { students: true } },
        students: {
          where: { status: "active" },
          select: {
            id: true,
            services: {
              orderBy: { validTo: "desc" },
              take: 1,
              select: { serviceType: { select: { id: true, code: true, name: true } } },
            },
            attendanceRecords: {
              where: { occurredAt: { gte: startOfToday, lt: endOfToday } },
              orderBy: { occurredAt: "desc" },
              take: 1,
              select: { status: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return classes.map(({ students, ...item }) => {
      const serviceMap = new Map<string, { id: string; code: string; name: string; count: number }>();
      let todayAttendanceCount = 0;
      for (const student of students) {
        const serviceType = student.services[0]?.serviceType;
        if (serviceType) {
          const current = serviceMap.get(serviceType.id) ?? { ...serviceType, count: 0 };
          current.count += 1;
          serviceMap.set(serviceType.id, current);
        }
        const status = student.attendanceRecords[0]?.status;
        if (status === AttendanceStatus.checked_in || status === AttendanceStatus.checked_out) {
          todayAttendanceCount += 1;
        }
      }
      return {
        ...item,
        serviceDistribution: Array.from(serviceMap.values()),
        todayAttendanceCount,
        activeStudentCount: students.length,
      };
    });
  }

  listTeacherOptions(user: AuthenticatedUser, campusId?: string) {
    const campusIds = campusId ? [campusId] : user.campusIds;
    if (campusId) {
      this.accessService.assertCampusAccess(user, campusId);
    }

    return this.prisma.user.findMany({
      where: {
        role: UserRole.teacher,
        campusAccess: { some: { campusId: { in: campusIds } } },
      },
      select: { id: true, name: true, phone: true },
      orderBy: { createdAt: "asc" },
    });
  }

  create(user: AuthenticatedUser, dto: CreateClassDto) {
    this.accessService.assertCampusAccess(user, dto.campusId);
    return this.prisma.class.create({
      data: dto,
      select: { id: true, campusId: true, name: true },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateClassDto) {
    const existing = await this.prisma.class.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Class not found");
    }

    this.accessService.assertCampusAccess(user, existing.campusId);
    if (dto.campusId) {
      this.accessService.assertCampusAccess(user, dto.campusId);
    }

    return this.prisma.class.update({
      where: { id },
      data: dto,
      select: { id: true, campusId: true, name: true },
    });
  }

  async assignTeacher(user: AuthenticatedUser, id: string, dto: AssignClassTeacherDto) {
    const classRow = await this.prisma.class.findUnique({ where: { id } });
    if (!classRow) {
      throw new NotFoundException("Class not found");
    }

    this.accessService.assertCampusAccess(user, classRow.campusId);
    const teacher = await this.prisma.user.findFirst({
      where: {
        id: dto.teacherId,
        role: UserRole.teacher,
        campusAccess: { some: { campusId: classRow.campusId } },
      },
      select: { id: true },
    });
    if (!teacher) {
      throw new NotFoundException("Teacher not found");
    }

    const binding = await this.prisma.teacherClass.upsert({
      where: { teacherId_classId: { teacherId: teacher.id, classId: classRow.id } },
      update: {},
      create: { teacherId: teacher.id, classId: classRow.id },
    });

    await this.prisma.auditLog.create({
      data: {
        campusId: classRow.campusId,
        actorUserId: user.id,
        action: "class.teacher_assign",
        targetType: "class",
        targetId: classRow.id,
        metadata: { teacherId: teacher.id },
      },
    });

    return binding;
  }
}
