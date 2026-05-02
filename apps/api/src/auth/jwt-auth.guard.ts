import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { UserRole } from "@prisma/client";
import type { AuthRequest, AuthenticatedUser } from "./types";

type JwtPayload = {
  sub: string;
  name: string;
  phone: string | null;
  role: UserRole;
  campusIds: string[];
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const authorization = request.headers.authorization;
    const token = typeof authorization === "string" && authorization.startsWith("Bearer ") ? authorization.slice(7) : null;

    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>("JWT_SECRET") ?? "development_jwt_secret_change_before_production",
      });
      request.user = {
        id: payload.sub,
        name: payload.name,
        phone: payload.phone,
        role: payload.role,
        campusIds: payload.campusIds,
      } satisfies AuthenticatedUser;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid bearer token");
    }
  }
}
