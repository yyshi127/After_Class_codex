import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/types";
import { AttendanceService } from "./attendance.service";
import { StudentCheckInDto } from "./dto/student-check-in.dto";
import { TeacherAttendanceDto } from "./dto/teacher-attendance.dto";

@UseGuards(JwtAuthGuard)
@Controller("attendance")
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get("students")
  listStudentAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Query("campusId") campusId?: string,
    @Query("studentId") studentId?: string,
  ) {
    return this.attendanceService.listStudentAttendance(user, campusId, studentId);
  }

  @Post("students/check-in")
  checkInStudent(@CurrentUser() user: AuthenticatedUser, @Body() dto: StudentCheckInDto) {
    return this.attendanceService.checkInStudent(user, dto);
  }

  @Get("teachers")
  listTeacherAttendance(@CurrentUser() user: AuthenticatedUser, @Query("campusId") campusId?: string) {
    return this.attendanceService.listTeacherAttendance(user, campusId);
  }

  @Post("teachers/check-in")
  teacherCheckIn(@CurrentUser() user: AuthenticatedUser, @Body() dto: TeacherAttendanceDto) {
    return this.attendanceService.teacherCheckIn(user, dto);
  }

  @Post("teachers/check-out")
  teacherCheckOut(@CurrentUser() user: AuthenticatedUser, @Body() dto: TeacherAttendanceDto) {
    return this.attendanceService.teacherCheckOut(user, dto);
  }
}
