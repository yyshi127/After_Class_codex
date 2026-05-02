import { IsString } from "class-validator";

export class CreateClassDto {
  @IsString()
  campusId!: string;

  @IsString()
  name!: string;
}
