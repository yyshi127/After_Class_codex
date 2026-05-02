import { BillingCycle } from "@prisma/client";
import { IsDateString, IsEnum, IsString } from "class-validator";

export class UpsertStudentServiceDto {
  @IsString()
  serviceTypeCode!: string;

  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;

  @IsDateString()
  validFrom!: string;

  @IsDateString()
  validTo!: string;
}
