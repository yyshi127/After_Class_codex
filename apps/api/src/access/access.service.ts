import { ForbiddenException, Injectable } from "@nestjs/common";
import { UserRole } from "@prisma/client";
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
}
