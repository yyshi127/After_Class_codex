import { IsBoolean, IsISO8601, IsOptional, IsString } from "class-validator";

export class CreateLeaveRequestDto {
  @IsString()
  studentId!: string;

  @IsString()
  type!: string;

  @IsISO8601()
  startsAt!: string;

  @IsISO8601()
  endsAt!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsBoolean()
  mealAffected!: boolean;
}
