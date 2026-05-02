import { IsInt, IsOptional, Max, Min } from "class-validator";

export class GenerateSimilarQuestionsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  count?: number;
}
