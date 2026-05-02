import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { compare } from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  private readonly maxFailedAttempts = 5;
  private readonly lockMinutes = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      include: {
        campusAccess: {
          include: { campus: true },
        },
      },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException("Invalid phone or password");
    }

    const failure = await this.prisma.loginFailure.findUnique({ where: { userId: user.id } });
    if (failure?.lockedUntil && failure.lockedUntil > new Date()) {
      throw new UnauthorizedException("Too many failed login attempts. Try again later.");
    }

    const valid = await compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.recordFailedLogin(user.id, failure?.failedCount ?? 0);
      throw new UnauthorizedException("Invalid phone or password");
    }

    await this.recordSuccessfulLogin(user.id);

    const campuses = user.campusAccess.map(({ campus }) => ({
      id: campus.id,
      name: campus.name,
    }));
    const campusIds = campuses.map((campus) => campus.id);

    const accessToken = await this.signAccessToken({
      sub: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      campusIds,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        campusIds,
        campuses,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        campusAccess: {
          include: { campus: true },
        },
      },
    });

    const campuses = user.campusAccess.map(({ campus }) => ({
      id: campus.id,
      name: campus.name,
    }));

    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      campusIds: campuses.map((campus) => campus.id),
      campuses,
    };
  }

  async refresh(userId: string) {
    const user = await this.getMe(userId);
    const accessToken = await this.signAccessToken({
      sub: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      campusIds: user.campusIds,
    });

    return { accessToken, user };
  }

  private async recordFailedLogin(userId: string, previousFailedCount: number) {
    const failedCount = previousFailedCount + 1;
    const lockedUntil =
      failedCount >= this.maxFailedAttempts ? new Date(Date.now() + this.lockMinutes * 60 * 1000) : null;

    await this.prisma.loginFailure.upsert({
      where: { userId },
      update: {
        failedCount,
        lockedUntil,
        lastFailedAt: new Date(),
      },
      create: {
        userId,
        failedCount,
        lockedUntil,
        lastFailedAt: new Date(),
      },
    });
  }

  private async recordSuccessfulLogin(userId: string) {
    await this.prisma.loginFailure.upsert({
      where: { userId },
      update: {
        failedCount: 0,
        lockedUntil: null,
        lastSucceededAt: new Date(),
      },
      create: {
        userId,
        failedCount: 0,
        lastSucceededAt: new Date(),
      },
    });
  }

  private signAccessToken(payload: {
    sub: string;
    name: string;
    phone: string | null;
    role: string;
    campusIds: string[];
  }) {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>("JWT_SECRET") ?? "development_jwt_secret_change_before_production",
      expiresIn: "8h",
    });
  }
}
