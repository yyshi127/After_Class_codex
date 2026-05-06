import { Injectable } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/types";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCampusDto } from "./dto/create-campus.dto";

@Injectable()
export class CampusesService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: AuthenticatedUser) {
    return this.prisma.campus.findMany({
      where: user.role === UserRole.admin ? { id: { in: user.campusIds } } : { userCampuses: { some: { userId: user.id } } },
      select: { id: true, name: true, address: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(user: AuthenticatedUser, dto: CreateCampusDto) {
    const campus = await this.prisma.campus.create({
      data: {
        name: dto.name,
        address: dto.address,
        userCampuses: {
          create: {
            userId: user.id,
          },
        },
      },
      select: { id: true, name: true, address: true },
    });

    await this.prisma.auditLog.create({
      data: {
        campusId: campus.id,
        actorUserId: user.id,
        action: "campus.create",
        targetType: "campus",
        targetId: campus.id,
      },
    });

    return campus;
  }
}
