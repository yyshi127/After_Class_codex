import { IsOptional, IsString } from "class-validator";

export class BindGuardianDto {
  @IsString()
  name!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  relation?: string;
}
