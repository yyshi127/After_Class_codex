import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type NotificationChannel = "sms" | "wechat_service_account";

export type NotificationChannelPayload = {
  recipientPhone?: string | null;
  title: string;
  content: string;
};

@Injectable()
export class NotificationChannelService {
  constructor(private readonly configService: ConfigService) {}

  async deliver(payload: NotificationChannelPayload) {
    const channels = this.enabledChannels();
    return channels.map((channel) => ({
      channel,
      status: payload.recipientPhone ? "disabled" : "skipped",
      reason: payload.recipientPhone ? "provider_not_configured" : "recipient_phone_missing",
    }));
  }

  private enabledChannels(): NotificationChannel[] {
    const configured = this.configService.get<string>("NOTIFICATION_EXTERNAL_CHANNELS") ?? "";
    return configured
      .split(",")
      .map((item) => item.trim())
      .filter((item): item is NotificationChannel => item === "sms" || item === "wechat_service_account");
  }
}
