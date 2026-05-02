import { IsOptional, IsString } from "class-validator";

export class CreateHomeworkReviewDto {
  @IsString()
  studentId!: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  originalImageUrl!: string;

  @IsOptional()
  @IsString()
  teacherComment?: string;
}
