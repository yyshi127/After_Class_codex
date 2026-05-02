import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import type { AuthenticatedUser } from "./types";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@CurrentUser() user: AuthenticatedUser) {
    return { user: await this.authService.getMe(user.id) };
  }

  @UseGuards(JwtAuthGuard)
  @Post("refresh")
  refresh(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.refresh(user.id);
  }

  @Post("logout")
  logout() {
    return { ok: true };
  }
}
