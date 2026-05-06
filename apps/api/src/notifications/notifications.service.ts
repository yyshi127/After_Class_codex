import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
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
      student.guardians.map((binding) => {
        const recipientUserId = binding.guardian.userLinks[0]?.userId;
        return this.prisma.notification.create({
          data: {
            campusId: student.campusId,
            studentId: student.id,
            guardianId: binding.guardianId,
            recipientUserId,
            title: input.title,
            content: input.content,
            status: recipientUserId ? "sent" : "failed",
            sentAt: recipientUserId ? new Date() : null,
            failReason: recipientUserId ? null : "guardian_user_not_linked",
          },
        });
      }),
    );
  }

  async createForStudentTeachers(input: { studentId: string; title: string; content: string }) {
    const student = await this.prisma.student.findUnique({
      where: { id: input.studentId },
      include: {
        class: {
          include: {
            teachers: {
              include: { teacher: true },
            },
          },
        },
      },
    });
    if (!student?.class) {
      return [];
    }

    return Promise.all(
      student.class.teachers.map((binding) =>
        this.prisma.notification.create({
          data: {
            campusId: student.campusId,
            studentId: student.id,
            recipientUserId: binding.teacherId,
            title: input.title,
            content: input.content,
            status: "sent",
            sentAt: new Date(),
          },
        }),
      ),
    );
  }

  async retryFailed(user: AuthenticatedUser, notificationId: string) {
    if (user.role === UserRole.guardian || user.role === UserRole.student) {
      throw new ForbiddenException("Only staff can retry notifications");
    }

    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        guardian: {
          include: { userLinks: true },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }
    if (notification.campusId) {
      this.accessService.assertCampusAccess(user, notification.campusId);
    }
    if (notification.status !== "failed") {
      throw new BadRequestException("Only failed notifications can be retried");
    }

    const recipientUserId = notification.recipientUserId ?? notification.guardian?.userLinks[0]?.userId ?? null;

    if (!recipientUserId) {
      return this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: "failed",
          sentAt: null,
          failReason: "guardian_user_not_linked",
          recipientUserId: null,
        },
      });
    }

    return this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        recipientUserId,
        status: "sent",
        sentAt: new Date(),
        failReason: null,
      },
    });
  }
}
