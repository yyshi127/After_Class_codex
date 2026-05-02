import { Injectable, NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/types";
import { AccessService } from "../access/access.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateClassDto } from "./dto/create-class.dto";
import { UpdateClassDto } from "./dto/update-class.dto";

@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: AccessService,
  ) {}

  list(user: AuthenticatedUser, campusId?: string) {
    const campusIds = campusId ? [campusId] : user.campusIds;
    if (campusId) {
      this.accessService.assertCampusAccess(user, campusId);
    }

    return this.prisma.class.findMany({
      where: { campusId: { in: campusIds } },
      select: {
        id: true,
        campusId: true,
        name: true,
        campus: { select: { id: true, name: true } },
        teachers: {
          select: {
            teacher: { select: { id: true, name: true, phone: true } },
          },
        },
        _count: { select: { students: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  create(user: AuthenticatedUser, dto: CreateClassDto) {
    this.accessService.assertCampusAccess(user, dto.campusId);
    return this.prisma.class.create({
      data: dto,
      select: { id: true, campusId: true, name: true },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateClassDto) {
    const existing = await this.prisma.class.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Class not found");
    }

    this.accessService.assertCampusAccess(user, existing.campusId);
    if (dto.campusId) {
      this.accessService.assertCampusAccess(user, dto.campusId);
    }

    return this.prisma.class.update({
      where: { id },
      data: dto,
      select: { id: true, campusId: true, name: true },
    });
  }
}
