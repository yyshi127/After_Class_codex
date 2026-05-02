import { IsEnum, IsOptional, IsString } from "class-validator";
import { FileObjectType } from "@prisma/client";

export class UploadImageDto {
  @IsString()
  campusId!: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsEnum(FileObjectType)
  type!: FileObjectType;

  @IsOptional()
  @IsString()
  businessType?: string;

  @IsOptional()
  @IsString()
  businessId?: string;
}
