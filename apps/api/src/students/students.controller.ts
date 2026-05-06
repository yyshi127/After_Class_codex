import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import type { Response } from "express";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { AuthenticatedUser } from "../auth/types";
import { BindGuardianDto } from "./dto/bind-guardian.dto";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { UpsertStudentServiceDto } from "./dto/upsert-student-service.dto";
import { StudentsService } from "./students.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("students")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query("campusId") campusId?: string,
    @Query("classId") classId?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.studentsService.list(user, campusId, classId, status, { page, pageSize });
  }

  @Roles(UserRole.admin)
  @Get("id-cards/export")
  async exportIdCards(
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
    @Query("campusId") campusId?: string,
    @Query("classId") classId?: string,
  ) {
    const csv = await this.studentsService.exportIdCards(user, campusId, classId);
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", "attachment; filename=\"student-id-cards.csv\"");
    return response.send(csv);
  }

  @Roles(UserRole.admin)
  @Get(":id/id-card")
  getIdCard(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.studentsService.getIdCard(user, id);
  }

  @Roles(UserRole.admin, UserRole.teacher)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStudentDto) {
    return this.studentsService.create(user, dto);
  }

  @Roles(UserRole.admin, UserRole.teacher)
  @Patch(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateStudentDto) {
    return this.studentsService.update(user, id, dto);
  }

  @Roles(UserRole.admin, UserRole.teacher)
  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.studentsService.remove(user, id);
  }

  @Roles(UserRole.admin)
  @Post(":id/service")
  upsertService(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpsertStudentServiceDto) {
    return this.studentsService.upsertService(user, id, dto);
  }

  @Roles(UserRole.admin)
  @Post(":id/guardians")
  bindGuardian(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: BindGuardianDto) {
    return this.studentsService.bindGuardian(user, id, dto);
  }
}
