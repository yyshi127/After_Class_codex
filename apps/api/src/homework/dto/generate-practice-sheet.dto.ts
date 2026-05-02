import { IsArray, IsOptional, IsString } from "class-validator";

export class GeneratePracticeSheetDto {
  @IsString()
  studentId!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsArray()
  @IsString({ each: true })
  similarQuestionIds!: string[];
}
