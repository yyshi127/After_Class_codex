import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/types";
import { AccessService } from "../access/access.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: AccessService,
  ) {}

  async list(user: AuthenticatedUser, campusId?: string, classId?: string, status?: string) {
    const students = await this.prisma.student.findMany({
      where: {
        ...this.accessService.buildStudentScopeWhere(user, { campusId, classId }),
        status: status || undefined,
      },
      select: {
        id: true,
        campusId: true,
        classId: true,
        name: true,
        gender: true,
        grade: true,
        schoolName: true,
        idCardNoEncrypted: true,
        status: true,
        createdAt: true,
        campus: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return students.map(({ idCardNoEncrypted, ...student }) => ({
      ...student,
      idCardNoMasked: maskIdCard(decryptDevIdCard(idCardNoEncrypted)),
    }));
  }

  async create(user: AuthenticatedUser, dto: CreateStudentDto) {
    this.accessService.assertCampusAccess(user, dto.campusId);
    await this.assertTeacherClassWritable(user, dto.classId, dto.campusId);

    return this.prisma.student.create({
      data: {
        campusId: dto.campusId,
        classId: dto.classId,
        name: dto.name,
        gender: dto.gender,
        grade: dto.grade,
        schoolName: dto.schoolName,
        idCardNoEncrypted: dto.idCardNo ? `dev-encrypted:${dto.idCardNo}` : undefined,
      },
      select: {
        id: true,
        campusId: true,
        classId: true,
        name: true,
        gender: true,
        grade: true,
        schoolName: true,
        status: true,
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateStudentDto) {
    const existing = await this.prisma.student.findFirst({
      where: this.accessService.buildStudentScopeWhere(user, { studentId: id }),
    });
    if (!existing) {
      throw new NotFoundException("Student not found");
    }

    this.accessService.assertCampusAccess(user, existing.campusId);
    if (dto.campusId) {
      this.accessService.assertCampusAccess(user, dto.campusId);
    }
    if (dto.classId) {
      const targetClass = await this.prisma.class.findUnique({ where: { id: dto.classId } });
      if (!targetClass) {
        throw new NotFoundException("Class not found");
      }
      this.accessService.assertCampusAccess(user, targetClass.campusId);
    }
    await this.assertTeacherClassWritable(user, dto.classId ?? existing.classId ?? undefined, dto.campusId ?? existing.campusId);

    return this.prisma.student.update({
      where: { id },
      data: {
        campusId: dto.campusId,
        classId: dto.classId,
        name: dto.name,
        gender: dto.gender,
        grade: dto.grade,
        schoolName: dto.schoolName,
        status: dto.status,
        idCardNoEncrypted: dto.idCardNo ? `dev-encrypted:${dto.idCardNo}` : undefined,
      },
      select: {
        id: true,
        campusId: true,
        classId: true,
        name: true,
        gender: true,
        grade: true,
        schoolName: true,
        status: true,
      },
    });
  }

  private async assertTeacherClassWritable(user: AuthenticatedUser, classId: string | undefined, campusId: string) {
    if (user.role !== UserRole.teacher) {
      return;
    }

    if (!classId) {
      throw new ForbiddenException("Teacher can only operate students in assigned classes");
    }

    const classMatch = await this.prisma.class.findFirst({
      where: {
        id: classId,
        campusId,
        teachers: {
          some: {
            teacherId: user.id,
          },
        },
      },
      select: { id: true },
    });
    if (!classMatch) {
      throw new ForbiddenException("Teacher can only operate students in assigned classes");
    }
  }
}

function decryptDevIdCard(value?: string | null) {
  if (!value) {
    return null;
  }
  return value.startsWith("dev-encrypted:") ? value.slice("dev-encrypted:".length) : null;
}

function maskIdCard(value: string | null) {
  if (!value) {
    return null;
  }
  if (value.length <= 8) {
    return "****";
  }
  return `${value.slice(0, 4)}**********${value.slice(-4)}`;
}
