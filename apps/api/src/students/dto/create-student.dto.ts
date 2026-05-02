import { IsOptional, IsString } from "class-validator";

export class CreateStudentDto {
  @IsString()
  campusId!: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsString()
  schoolName?: string;

  @IsOptional()
  @IsString()
  idCardNo?: string;
}
