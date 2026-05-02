import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/types";

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getScope(user: AuthenticatedUser) {
    const campuses = await this.prisma.campus.findMany({
      where: {
        userCampuses: {
          some: { userId: user.id },
        },
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const teacherClasses =
      user.role === UserRole.teacher
        ? await this.prisma.class.findMany({
            where: {
              teachers: {
                some: { teacherId: user.id },
              },
            },
            select: {
              id: true,
              name: true,
              campusId: true,
            },
            orderBy: { createdAt: "asc" },
          })
        : [];

    const guardianStudents =
      user.role === UserRole.guardian
        ? await this.prisma.student.findMany({
            where: {
              guardians: {
                some: {
                  guardian: {
                    userLinks: {
                      some: { userId: user.id },
                    },
                  },
                },
              },
            },
            select: {
              id: true,
              name: true,
              campusId: true,
            },
            orderBy: { createdAt: "asc" },
          })
        : [];

    const ownStudents =
      user.role === UserRole.student
        ? await this.prisma.student.findMany({
            where: {
              userLinks: {
                some: { userId: user.id },
              },
            },
            select: {
              id: true,
              name: true,
              campusId: true,
            },
          })
        : [];

    return {
      role: user.role,
      campuses,
      teacherClasses,
      guardianStudents,
      ownStudents,
    };
  }

  assertCampusAccess(user: AuthenticatedUser, campusId: string) {
    if (!user.campusIds.includes(campusId)) {
      throw new ForbiddenException("No access to this campus");
    }
  }

  buildStudentScopeWhere(
    user: AuthenticatedUser,
    options: { campusId?: string; classId?: string; studentId?: string } = {},
  ): Prisma.StudentWhereInput {
    const campusIds = options.campusId ? [options.campusId] : user.campusIds;
    if (options.campusId) {
      this.assertCampusAccess(user, options.campusId);
    }

    const base: Prisma.StudentWhereInput = {
      campusId: { in: campusIds },
      classId: options.classId || undefined,
      id: options.studentId || undefined,
    };

    if (user.role === UserRole.admin) {
      return base;
    }

    if (user.role === UserRole.teacher) {
      return {
        ...base,
        class: {
          teachers: {
            some: { teacherId: user.id },
          },
        },
      };
    }

    if (user.role === UserRole.guardian) {
      return {
        ...base,
        guardians: {
          some: {
            guardian: {
              userLinks: {
                some: { userId: user.id },
              },
            },
          },
        },
      };
    }

    return {
      ...base,
      userLinks: {
        some: { userId: user.id },
      },
    };
  }

  async findAccessibleStudent(user: AuthenticatedUser, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: this.buildStudentScopeWhere(user, { studentId }),
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }
    return student;
  }
}
