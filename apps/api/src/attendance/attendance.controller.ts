import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/types";
import { AttendanceService } from "./attendance.service";
import { ManualStudentAttendanceDto } from "./dto/manual-student-attendance.dto";
import { ManualTeacherAttendanceDto } from "./dto/manual-teacher-attendance.dto";
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
    @Query("classId") classId?: string,
    @Query("serviceTypeId") serviceTypeId?: string,
  ) {
    return this.attendanceService.listStudentAttendance(user, campusId, studentId, classId, serviceTypeId);
  }

  @Post("students/check-in")
  checkInStudent(@CurrentUser() user: AuthenticatedUser, @Body() dto: StudentCheckInDto) {
    return this.attendanceService.checkInStudent(user, dto);
  }

  @Post("students/manual")
  manualStudentAttendance(@CurrentUser() user: AuthenticatedUser, @Body() dto: ManualStudentAttendanceDto) {
    return this.attendanceService.manualStudentAttendance(user, dto);
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

  @Post("teachers/manual")
  manualTeacherAttendance(@CurrentUser() user: AuthenticatedUser, @Body() dto: ManualTeacherAttendanceDto) {
    return this.attendanceService.manualTeacherAttendance(user, dto);
  }
}
