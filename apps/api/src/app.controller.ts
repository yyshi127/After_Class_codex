import { Controller, Get, UseGuards } from "@nestjs/common";
import { SERVICE_TYPES, USER_ROLES } from "@afterclass/shared";
import { Roles } from "./auth/roles.decorator";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { RolesGuard } from "./auth/roles.guard";

@Controller()
export class AppController {
  @Get("health")
  health() {
    return {
      ok: true,
      service: "afterclass-api",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("bootstrap")
  bootstrap() {
    return {
      roles: USER_ROLES,
      serviceTypes: SERVICE_TYPES,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Get("admin-only")
  adminOnly() {
    return { ok: true, scope: "admin" };
  }
}
