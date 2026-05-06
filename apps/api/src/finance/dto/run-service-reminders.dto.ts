import { IsEnum, IsOptional, IsString } from "class-validator";

export enum ServiceReminderMode {
  upcoming = "upcoming",
  today = "today",
}

export class RunServiceRemindersDto {
  @IsString()
  campusId!: string;

  @IsEnum(ServiceReminderMode)
  mode!: ServiceReminderMode;

  @IsOptional()
  daysBefore?: number;
}
