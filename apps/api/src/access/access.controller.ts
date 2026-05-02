import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/types";
import { AccessService } from "./access.service";

@UseGuards(JwtAuthGuard)
@Controller("access")
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  @Get("scope")
  scope(@CurrentUser() user: AuthenticatedUser) {
    return this.accessService.getScope(user);
  }

  @Get("campus-check")
  campusCheck(@CurrentUser() user: AuthenticatedUser, @Query("campusId") campusId: string) {
    this.accessService.assertCampusAccess(user, campusId);
    return { ok: true, campusId };
  }
}
