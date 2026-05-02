import { MistakeStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateMistakeStatusDto {
  @IsEnum(MistakeStatus)
  status!: MistakeStatus;

  @IsOptional()
  @IsString()
  knowledgePoint?: string;
}
