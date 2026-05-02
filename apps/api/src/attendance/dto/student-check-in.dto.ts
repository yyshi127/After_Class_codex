import { IsISO8601, IsOptional, IsString } from "class-validator";

export class StudentCheckInDto {
  @IsString()
  studentId!: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
}
