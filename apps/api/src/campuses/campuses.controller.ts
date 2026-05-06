import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { AuthenticatedUser } from "../auth/types";
import { CampusesService } from "./campuses.service";
import { CreateCampusDto } from "./dto/create-campus.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("campuses")
export class CampusesController {
  constructor(private readonly campusesService: CampusesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.campusesService.list(user);
  }

  @Roles(UserRole.admin)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCampusDto) {
    return this.campusesService.create(user, dto);
  }
}
