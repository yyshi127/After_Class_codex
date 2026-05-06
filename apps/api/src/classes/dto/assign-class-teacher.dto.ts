import { IsString } from "class-validator";

export class AssignClassTeacherDto {
  @IsString()
  teacherId!: string;
}
