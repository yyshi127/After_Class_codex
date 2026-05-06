import { IsOptional, IsString } from "class-validator";

export class GenerateFeedbackDraftDto {
  @IsString()
  studentId!: string;

  @IsOptional()
  @IsString()
  reviewId?: string;

  @IsOptional()
  @IsString()
  teacherNote?: string;
}
