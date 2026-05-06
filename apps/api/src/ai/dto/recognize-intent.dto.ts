import { IsOptional, IsString } from "class-validator";

export class RecognizeIntentDto {
  @IsString()
  input!: string;

  @IsOptional()
  @IsString()
  campusId?: string;
}
