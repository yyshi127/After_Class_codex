import { UserRole } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class CreateUserDto {
  @IsEnum(UserRole)
  role!: UserRole;

  @IsString()
  name!: string;

  @IsString()
  phone!: string;

  @IsString()
  campusId!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
