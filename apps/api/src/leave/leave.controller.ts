import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/types";
import { CreateLeaveRequestDto } from "./dto/create-leave-request.dto";
import { LeaveService } from "./leave.service";

@UseGuards(JwtAuthGuard)
@Controller("leave-requests")
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("campusId") campusId?: string, @Query("studentId") studentId?: string) {
    return this.leaveService.list(user, campusId, studentId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLeaveRequestDto) {
    return this.leaveService.create(user, dto);
  }
}
