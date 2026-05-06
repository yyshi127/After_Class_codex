import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/types";
import { NotificationsService } from "./notifications.service";

@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("campusId") campusId?: string, @Query("studentId") studentId?: string) {
    return this.notificationsService.list(user, campusId, studentId);
  }

  @Post(":id/retry")
  retry(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.notificationsService.retryFailed(user, id);
  }
}
