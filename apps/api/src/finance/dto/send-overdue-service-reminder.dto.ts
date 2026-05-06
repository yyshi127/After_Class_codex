import { IsString } from "class-validator";

export class SendOverdueServiceReminderDto {
  @IsString()
  studentId!: string;
}
