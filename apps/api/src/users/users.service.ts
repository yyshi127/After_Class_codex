import { ConflictException, Injectable } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { AccessService } from "../access/access.service";
import type { AuthenticatedUser } from "../auth/types";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: AccessService,
  ) {}

  list(user: AuthenticatedUser, campusId?: string, role?: UserRole) {
    const campusIds = campusId ? [campusId] : user.campusIds;
    if (campusId) {
      this.accessService.assertCampusAccess(user, campusId);
    }

    return this.prisma.user.findMany({
      where: {
        role,
        campusAccess: { some: { campusId: { in: campusIds } } },
      },
      select: { id: true, name: true, phone: true, role: true, campusId: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async create(user: AuthenticatedUser, dto: CreateUserDto) {
    this.accessService.assertCampusAccess(user, dto.campusId);
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone }, select: { id: true } });
    if (existing) {
      throw new ConflictException("User phone already exists");
    }

    const created = await this.prisma.user.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        role: dto.role,
        campusId: dto.campusId,
        passwordHash: await hash(dto.password ?? "Admin123456", 10),
        campusAccess: {
          create: {
            campusId: dto.campusId,
          },
        },
      },
      select: { id: true, name: true, phone: true, role: true, campusId: true },
    });

    await this.prisma.auditLog.create({
      data: {
        campusId: dto.campusId,
        actorUserId: user.id,
        action: "user.create",
        targetType: "user",
        targetId: created.id,
        metadata: {
          role: dto.role,
        },
      },
    });

    return created;
  }
}
