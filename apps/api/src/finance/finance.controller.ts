import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/types";
import { CreateBillingRecordDto } from "./dto/create-billing-record.dto";
import { GenerateClassSettlementDto } from "./dto/generate-class-settlement.dto";
import { UpsertTeacherFeeConfigDto } from "./dto/upsert-teacher-fee-config.dto";
import { FinanceService } from "./finance.service";

@UseGuards(JwtAuthGuard)
@Controller("finance")
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get("billing-records")
  listBillingRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Query("campusId") campusId?: string,
    @Query("studentId") studentId?: string,
  ) {
    return this.financeService.listBillingRecords(user, campusId, studentId);
  }

  @Post("billing-records")
  createBillingRecord(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBillingRecordDto) {
    return this.financeService.createBillingRecord(user, dto);
  }

  @Get("service-summary")
  getServiceSummary(@CurrentUser() user: AuthenticatedUser, @Query("studentId") studentId: string) {
    return this.financeService.getServiceSummary(user, studentId);
  }

  @Post("teacher-fee-configs")
  upsertTeacherFeeConfig(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertTeacherFeeConfigDto) {
    return this.financeService.upsertTeacherFeeConfig(user, dto);
  }

  @Get("class-settlements")
  listClassSettlements(
    @CurrentUser() user: AuthenticatedUser,
    @Query("campusId") campusId?: string,
    @Query("classId") classId?: string,
    @Query("periodStart") periodStart?: string,
    @Query("periodEnd") periodEnd?: string,
  ) {
    return this.financeService.listClassSettlements(user, campusId, classId, periodStart, periodEnd);
  }

  @Post("class-settlements/generate")
  generateClassSettlement(@CurrentUser() user: AuthenticatedUser, @Body() dto: GenerateClassSettlementDto) {
    return this.financeService.generateClassSettlement(user, dto);
  }
}
