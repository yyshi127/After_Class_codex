import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { AuthenticatedUser } from "../auth/types";
import { ClassesService } from "./classes.service";
import { AssignClassTeacherDto } from "./dto/assign-class-teacher.dto";
import { CreateClassDto } from "./dto/create-class.dto";
import { UpdateClassDto } from "./dto/update-class.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("classes")
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("campusId") campusId?: string) {
    return this.classesService.list(user, campusId);
  }

  @Roles(UserRole.admin)
  @Get("teacher-options")
  listTeacherOptions(@CurrentUser() user: AuthenticatedUser, @Query("campusId") campusId?: string) {
    return this.classesService.listTeacherOptions(user, campusId);
  }

  @Roles(UserRole.admin)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateClassDto) {
    return this.classesService.create(user, dto);
  }

  @Roles(UserRole.admin)
  @Patch(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateClassDto) {
    return this.classesService.update(user, id, dto);
  }

  @Roles(UserRole.admin)
  @Post(":id/teachers")
  assignTeacher(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: AssignClassTeacherDto) {
    return this.classesService.assignTeacher(user, id, dto);
  }
}
