import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpsertTeacherFeeConfigDto {
  @IsString()
  campusId!: string;

  @IsString()
  teacherId!: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsInt()
  @Min(0)
  feePerAttendCents!: number;

  @IsString()
  effectiveFrom!: string;

  @IsOptional()
  @IsString()
  effectiveTo?: string;
}
