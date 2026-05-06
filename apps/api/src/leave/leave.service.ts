import { Injectable } from "@nestjs/common";
import { AccessService } from "../access/access.service";
import type { AuthenticatedUser } from "../auth/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: AccessService,
  ) {}

  list(user: AuthenticatedUser, campusId?: string, studentId?: string) {
    return this.prisma.leaveRequest.findMany({
      where: {
        student: this.accessService.buildStudentScopeWhere(user, { campusId, studentId }),
      },
      include: {
        student: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
}
