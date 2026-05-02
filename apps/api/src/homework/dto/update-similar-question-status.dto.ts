import { SimilarQuestionStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UpdateSimilarQuestionStatusDto {
  @IsEnum(SimilarQuestionStatus)
  status!: SimilarQuestionStatus;
}
