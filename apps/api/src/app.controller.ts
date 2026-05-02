import { Controller, Get, UseGuards } from "@nestjs/common";
import { SERVICE_TYPES, USER_ROLES } from "@afterclass/shared";
import { Roles } from "./auth/roles.decorator";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { RolesGuard } from "./auth/roles.guard";
import { CurrentUser } from "./auth/current-user.decorator";
import type { AuthenticatedUser } from "./auth/types";
import { PrismaService } from "./prisma/prisma.service";

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("health")
  health() {
    return {
      ok: true,
      service: "afterclass-api",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("bootstrap")
  bootstrap() {
    return {
      roles: USER_ROLES,
      serviceTypes: SERVICE_TYPES,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Get("admin-only")
  adminOnly() {
    return { ok: true, scope: "admin" };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Get("dashboard/admin")
  async adminDashboard(@CurrentUser() user: AuthenticatedUser) {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const campusIds = user.campusIds;
    const studentWhere = { campusId: { in: campusIds }, status: "active" };

    const [
      activeStudentCount,
      todayAttendance,
      pendingLeaveCount,
      todayHomeworkTotal,
      todayHomeworkCompleted,
      expiringServiceCount,
      overdueBillingCount,
      campuses,
      classes,
      recentLogs,
    ] = await Promise.all([
      this.prisma.student.count({ where: studentWhere }),
      this.prisma.attendanceRecord.findMany({
        where: {
          campusId: { in: campusIds },
          occurredAt: { gte: startOfToday, lte: endOfToday },
          status: { in: ["checked_in", "checked_out"] },
        },
        select: { studentId: true, campusId: true },
        distinct: ["studentId"],
      }),
      this.prisma.leaveRequest.count({
        where: {
          campusId: { in: campusIds },
          status: "pending",
        },
      }),
      this.prisma.homeworkReview.count({
        where: {
          campusId: { in: campusIds },
          createdAt: { gte: startOfToday, lte: endOfToday },
        },
      }),
      this.prisma.homeworkReview.count({
        where: {
          campusId: { in: campusIds },
          createdAt: { gte: startOfToday, lte: endOfToday },
          status: "completed",
        },
      }),
      this.prisma.studentService.count({
        where: {
          student: { campusId: { in: campusIds }, status: "active" },
          validTo: { gte: now, lte: sevenDaysLater },
        },
      }),
      this.prisma.billingRecord.count({
        where: {
          campusId: { in: campusIds },
          periodEnd: { lt: now },
          balanceCents: { gt: 0 },
        },
      }),
      this.prisma.campus.findMany({
        where: { id: { in: campusIds } },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.class.findMany({
        where: { campusId: { in: campusIds } },
        select: {
          id: true,
          name: true,
          campusId: true,
          campus: { select: { id: true, name: true } },
          students: { where: { status: "active" }, select: { id: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.auditLog.findMany({
        where: { campusId: { in: campusIds } },
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          createdAt: true,
          actor: { select: { id: true, name: true } },
          campus: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

    const checkedInStudentIds = new Set(todayAttendance.map((item) => item.studentId));
    const attendanceRate = activeStudentCount > 0 ? Math.round((checkedInStudentIds.size / activeStudentCount) * 100) : 0;

    const campusOverview = campuses.map((campus) => {
      const campusClassIds = classes.filter((item) => item.campusId === campus.id).map((item) => item.id);
      const campusStudentIds = classes
        .filter((item) => item.campusId === campus.id)
        .flatMap((item) => item.students.map((student) => student.id));
      return {
        id: campus.id,
        name: campus.name,
        classCount: campusClassIds.length,
        activeStudentCount: campusStudentIds.length,
        todayAttendanceCount: todayAttendance.filter((item) => item.campusId === campus.id).length,
      };
    });

    const classStatus = classes.map((item) => {
      const studentIds = item.students.map((student) => student.id);
      const todayCount = todayAttendance.filter((record) => studentIds.includes(record.studentId)).length;
      return {
        id: item.id,
        name: item.name,
        campusId: item.campusId,
        campusName: item.campus.name,
        activeStudentCount: studentIds.length,
        todayAttendanceCount: todayCount,
        attendanceRate: studentIds.length > 0 ? Math.round((todayCount / studentIds.length) * 100) : 0,
      };
    });

    return {
      date: startOfToday.toISOString().slice(0, 10),
      metrics: {
        todayCareStudentCount: checkedInStudentIds.size,
        activeStudentCount,
        attendanceRate,
        pendingLeaveCount,
        homeworkCompletionRate: todayHomeworkTotal > 0 ? Math.round((todayHomeworkCompleted / todayHomeworkTotal) * 100) : 0,
        todayHomeworkTotal,
        expiringServiceCount,
        riskWarningCount: pendingLeaveCount + overdueBillingCount,
        overdueBillingCount,
      },
      campusOverview,
      classStatus,
      recentLogs,
    };
  }
}
