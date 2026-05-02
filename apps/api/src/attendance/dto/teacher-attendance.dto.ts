import { IsISO8601, IsOptional, IsString } from "class-validator";

export class TeacherAttendanceDto {
  @IsString()
  campusId!: string;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
