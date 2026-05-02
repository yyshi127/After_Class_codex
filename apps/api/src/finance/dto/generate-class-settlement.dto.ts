import { IsOptional, IsString } from "class-validator";

export class GenerateClassSettlementDto {
  @IsString()
  campusId!: string;

  @IsString()
  classId!: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsString()
  periodStart!: string;

  @IsString()
  periodEnd!: string;
}
