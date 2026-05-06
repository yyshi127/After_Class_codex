import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { AuthenticatedUser } from "../auth/types";
import { AccessService } from "../access/access.service";
import { paginatedResult, parsePagination, type PaginationQuery } from "../common/pagination";
import { PrismaService } from "../prisma/prisma.service";
import { BindGuardianDto } from "./dto/bind-guardian.dto";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { UpsertStudentServiceDto } from "./dto/upsert-student-service.dto";

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: AccessService,
  ) {}

  async list(user: AuthenticatedUser, campusId?: string, classId?: string, status?: string, paginationQuery: PaginationQuery = {}) {
    const isPaginated = paginationQuery.page !== undefined || paginationQuery.pageSize !== undefined;
    const pagination = parsePagination(paginationQuery);
    const where = {
      ...this.accessService.buildStudentScopeWhere(user, { campusId, classId }),
      status: status || undefined,
    };
    const students = await this.prisma.student.findMany({
      where,
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
        services: {
          orderBy: { validTo: "desc" },
          take: 1,
          select: {
            id: true,
            billingCycle: true,
            validFrom: true,
            validTo: true,
            serviceType: {
              select: {
                id: true,
                code: true,
                name: true,
                includesPickup: true,
                includesMeal: true,
                includesRest: true,
                includesHomeworkHelp: true,
              },
            },
          },
        },
        guardians: {
          select: {
            relation: true,
            guardian: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
          orderBy: { guardian: { createdAt: "asc" } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: isPaginated ? pagination.skip : undefined,
      take: isPaginated ? pagination.take : 100,
    });

    const items = students.map(({ idCardNoEncrypted, services, guardians, ...student }) => {
      const idCardNo = decryptIdCard(idCardNoEncrypted);
      return {
        ...student,
        idCardNoMasked: maskIdCard(idCardNo),
        idCardNoFull: user.role === UserRole.admin ? idCardNo : undefined,
        currentService: services[0] ?? null,
        guardians: guardians.map(({ relation, guardian }) => ({
          ...guardian,
          relation,
        })),
      };
    });

    if (!isPaginated) {
      return items;
    }

    const total = await this.prisma.student.count({ where });
    return paginatedResult(items, total, pagination.page, pagination.pageSize);
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
        idCardNoEncrypted: dto.idCardNo ? encryptIdCard(dto.idCardNo) : undefined,
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
      },
    }).then(({ idCardNoEncrypted, ...student }) => {
      const idCardNo = decryptIdCard(idCardNoEncrypted);
      return {
        ...student,
        idCardNoMasked: maskIdCard(idCardNo),
        idCardNoFull: user.role === UserRole.admin ? idCardNo : undefined,
      };
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
        idCardNoEncrypted: dto.idCardNo ? encryptIdCard(dto.idCardNo) : undefined,
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
      },
    }).then(({ idCardNoEncrypted, ...student }) => {
      const idCardNo = decryptIdCard(idCardNoEncrypted);
      return {
        ...student,
        idCardNoMasked: maskIdCard(idCardNo),
        idCardNoFull: user.role === UserRole.admin ? idCardNo : undefined,
      };
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const existing = await this.prisma.student.findFirst({
      where: this.accessService.buildStudentScopeWhere(user, { studentId: id }),
    });
    if (!existing) {
      throw new NotFoundException("Student not found");
    }

    await this.assertTeacherClassWritable(user, existing.classId ?? undefined, existing.campusId);
    const student = await this.prisma.student.update({
      where: { id },
      data: { status: "inactive" },
      select: { id: true, status: true },
    });

    await this.prisma.auditLog.create({
      data: {
        campusId: existing.campusId,
        actorUserId: user.id,
        action: "student.deactivate",
        targetType: "student",
        targetId: existing.id,
      },
    });

    return student;
  }

  async getIdCard(user: AuthenticatedUser, id: string) {
    const student = await this.prisma.student.findFirst({
      where: this.accessService.buildStudentScopeWhere(user, { studentId: id }),
      select: {
        id: true,
        campusId: true,
        name: true,
        idCardNoEncrypted: true,
      },
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }

    const idCardNo = decryptIdCard(student.idCardNoEncrypted);
    await this.prisma.auditLog.create({
      data: {
        campusId: student.campusId,
        actorUserId: user.id,
        action: "student.id_card_full_view",
        targetType: "student",
        targetId: student.id,
        metadata: {
          viewerRole: user.role,
        },
      },
    });

    return {
      studentId: student.id,
      studentName: student.name,
      idCardNoFull: idCardNo,
      idCardNoMasked: maskIdCard(idCardNo),
    };
  }

  async exportIdCards(user: AuthenticatedUser, campusId?: string, classId?: string) {
    const students = await this.prisma.student.findMany({
      where: this.accessService.buildStudentScopeWhere(user, { campusId, classId }),
      select: {
        id: true,
        campusId: true,
        classId: true,
        name: true,
        idCardNoEncrypted: true,
        campus: { select: { name: true } },
        class: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 1000,
    });

    await this.prisma.auditLog.create({
      data: {
        campusId: campusId ?? null,
        actorUserId: user.id,
        action: "student.id_card_export",
        targetType: classId ? "class" : campusId ? "campus" : "student",
        targetId: classId ?? campusId ?? null,
        metadata: {
          classId,
          exportedCount: students.length,
        },
      },
    });

    const rows = [
      ["student_id", "campus", "class", "name", "id_card_no"],
      ...students.map((student) => [
        student.id,
        student.campus.name,
        student.class?.name ?? "",
        student.name,
        decryptIdCard(student.idCardNoEncrypted) ?? "",
      ]),
    ];
    return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  }

  async upsertService(user: AuthenticatedUser, id: string, dto: UpsertStudentServiceDto) {
    const student = await this.accessService.findAccessibleStudent(user, id);
    await this.assertTeacherClassWritable(user, student.classId ?? undefined, student.campusId);

    const serviceType = await this.prisma.serviceType.findUnique({
      where: { code: dto.serviceTypeCode },
    });
    if (!serviceType) {
      throw new NotFoundException("Service type not found");
    }

    return this.prisma.studentService.create({
      data: {
        studentId: student.id,
        serviceTypeId: serviceType.id,
        billingCycle: dto.billingCycle,
        validFrom: new Date(dto.validFrom),
        validTo: new Date(dto.validTo),
      },
      include: { serviceType: true },
    });
  }

  async bindGuardian(user: AuthenticatedUser, id: string, dto: BindGuardianDto) {
    const student = await this.accessService.findAccessibleStudent(user, id);
    this.accessService.assertCampusAccess(user, student.campusId);

    const guardian = await this.prisma.guardian.upsert({
      where: { phone: dto.phone },
      update: { name: dto.name },
      create: {
        name: dto.name,
        phone: dto.phone,
      },
    });

    await this.prisma.guardianStudent.upsert({
      where: {
        guardianId_studentId: {
          guardianId: guardian.id,
          studentId: student.id,
        },
      },
      update: { relation: dto.relation },
      create: {
        guardianId: guardian.id,
        studentId: student.id,
        relation: dto.relation,
      },
    });

    const guardianUser = await this.prisma.user.findFirst({
      where: {
        phone: dto.phone,
        role: UserRole.guardian,
      },
      select: { id: true },
    });

    if (guardianUser) {
      await this.prisma.userGuardian.upsert({
        where: { userId: guardianUser.id },
        update: { guardianId: guardian.id },
        create: {
          userId: guardianUser.id,
          guardianId: guardian.id,
        },
      });
      await this.prisma.userCampus.upsert({
        where: {
          userId_campusId: {
            userId: guardianUser.id,
            campusId: student.campusId,
          },
        },
        update: {},
        create: {
          userId: guardianUser.id,
          campusId: student.campusId,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        campusId: student.campusId,
        actorUserId: user.id,
        action: "student.guardian_bind",
        targetType: "student",
        targetId: student.id,
        metadata: {
          guardianId: guardian.id,
          relation: dto.relation,
          linkedExistingGuardianUser: Boolean(guardianUser),
        },
      },
    });

    return {
      id: guardian.id,
      name: guardian.name,
      phone: guardian.phone,
      relation: dto.relation ?? null,
      linkedExistingGuardianUser: Boolean(guardianUser),
    };
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

function encryptIdCard(value: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `aes-256-gcm:v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptIdCard(value?: string | null) {
  if (!value) {
    return null;
  }
  if (value.startsWith("dev-encrypted:")) {
    return value.slice("dev-encrypted:".length);
  }
  if (!value.startsWith("aes-256-gcm:v1:")) {
    return null;
  }

  try {
    const [, , ivText, tagText, encryptedText] = value.split(":");
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivText, "base64"));
    decipher.setAuthTag(Buffer.from(tagText, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

function getEncryptionKey() {
  const rawKey = process.env.ENCRYPTION_KEY;
  if (!rawKey && process.env.NODE_ENV === "production") {
    throw new Error("ENCRYPTION_KEY is required in production");
  }
  return createHash("sha256").update(rawKey || "afterclass-development-only-encryption-key").digest();
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

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
