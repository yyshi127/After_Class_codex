import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/types";
import { PrismaService } from "../prisma/prisma.service";
import { AccessService } from "./access.service";

@UseGuards(JwtAuthGuard)
@Controller("access")
export class AccessController {
  constructor(
    private readonly accessService: AccessService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("scope")
  scope(@CurrentUser() user: AuthenticatedUser) {
    return this.accessService.getScope(user);
  }

  @Get("campus-check")
  async campusCheck(@CurrentUser() user: AuthenticatedUser, @Query("campusId") campusId: string) {
    try {
      this.accessService.assertCampusAccess(user, campusId);
    } catch (error) {
      await this.prisma.auditLog.create({
        data: {
          campusId,
          actorUserId: user.id,
          action: "access.campus_denied",
          targetType: "campus",
          targetId: campusId,
          metadata: {
            role: user.role,
            allowedCampusIds: user.campusIds,
          },
        },
      });
      throw error;
    }
    return { ok: true, campusId };
  }
}
