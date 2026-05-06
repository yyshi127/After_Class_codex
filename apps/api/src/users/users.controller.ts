import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { AuthenticatedUser } from "../auth/types";
import { CreateUserDto } from "./dto/create-user.dto";
import { UsersService } from "./users.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(UserRole.admin)
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("campusId") campusId?: string, @Query("role") role?: UserRole) {
    return this.usersService.list(user, campusId, role);
  }

  @Roles(UserRole.admin)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUserDto) {
    return this.usersService.create(user, dto);
  }
}
