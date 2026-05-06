import { AttendanceStatus } from "@prisma/client";
import { IsEnum, IsISO8601, IsOptional, IsString } from "class-validator";

export class ManualStudentAttendanceDto {
  @IsString()
  studentId!: string;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @IsISO8601()
  occurredAt!: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
