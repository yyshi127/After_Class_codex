import { BillingCycle } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateBillingRecordDto {
  @IsString()
  campusId!: string;

  @IsString()
  studentId!: string;

  @IsOptional()
  @IsString()
  serviceTypeId?: string;

  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;

  @IsString()
  periodStart!: string;

  @IsString()
  periodEnd!: string;

  @IsInt()
  @Min(0)
  amountDueCents!: number;

  @IsInt()
  @Min(0)
  amountPaidCents!: number;

  @IsOptional()
  @IsString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
