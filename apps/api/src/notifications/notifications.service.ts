import { Injectable } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AccessService } from "../access/access.service";
import type { AuthenticatedUser } from "../auth/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: AccessService,
  ) {}

  async list(user: AuthenticatedUser, campusId?: string, studentId?: string) {
    if (user.role === UserRole.guardian) {
      return this.prisma.notification.findMany({
        where: {
          recipientUserId: user.id,
          student: studentId ? this.accessService.buildStudentScopeWhere(user, { campusId, studentId }) : undefined,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    }

    if (user.role === UserRole.student) {
      return this.prisma.notification.findMany({
        where: {
          student: this.accessService.buildStudentScopeWhere(user, { campusId, studentId }),
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    }

    const campusIds = campusId ? [campusId] : user.campusIds;
    if (campusId) {
      this.accessService.assertCampusAccess(user, campusId);
    }

    return this.prisma.notification.findMany({
      where: {
        campusId: { in: campusIds },
        studentId: studentId || undefined,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async createForStudentGuardians(input: { studentId: string; title: string; content: string }) {
    const student = await this.prisma.student.findUnique({
      where: { id: input.studentId },
      include: {
        guardians: {
          include: {
            guardian: {
              include: { userLinks: true },
            },
          },
        },
      },
    });
    if (!student) {
      return [];
    }

    return Promise.all(
      student.guardians.map((binding) =>
        this.prisma.notification.create({
          data: {
            campusId: student.campusId,
            studentId: student.id,
            guardianId: binding.guardianId,
            recipientUserId: binding.guardian.userLinks[0]?.userId,
            title: input.title,
            content: input.content,
            status: "sent",
            sentAt: new Date(),
          },
        }),
      ),
    );
  }
}
