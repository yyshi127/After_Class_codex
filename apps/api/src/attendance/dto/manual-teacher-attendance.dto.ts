import { TeacherAttendanceStatus } from "@prisma/client";
import { IsEnum, IsISO8601, IsOptional, IsString } from "class-validator";

export class ManualTeacherAttendanceDto {
  @IsString()
  campusId!: string;

  @IsString()
  teacherId!: string;

  @IsEnum(TeacherAttendanceStatus)
  status!: TeacherAttendanceStatus;

  @IsISO8601()
  occurredAt!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
