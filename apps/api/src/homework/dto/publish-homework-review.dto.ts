import { IsOptional, IsString } from "class-validator";

export class PublishHomeworkReviewDto {
  @IsOptional()
  @IsString()
  reviewedImageUrl?: string;

  @IsOptional()
  @IsString()
  teacherComment?: string;
}
