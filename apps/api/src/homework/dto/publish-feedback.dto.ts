import { IsString } from "class-validator";

export class PublishFeedbackDto {
  @IsString()
  studentId!: string;

  @IsString()
  behavior!: string;

  @IsString()
  homework!: string;

  @IsString()
  knowledge!: string;
}
