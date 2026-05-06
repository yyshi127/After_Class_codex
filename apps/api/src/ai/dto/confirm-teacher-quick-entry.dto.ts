import { IsBoolean, IsIn, IsISO8601, IsOptional, IsString } from "class-validator";

export class ConfirmTeacherQuickEntryDto {
  @IsString()
  logId!: string;

  @IsString()
  studentId!: string;

  @IsIn(["check_in", "leave", "absent"])
  action!: "check_in" | "leave" | "absent";

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @IsOptional()
  @IsBoolean()
  secondConfirmed?: boolean;
}
