import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: { action?: string; targetEntity?: string; limit?: number }) {
    const where: any = {};
    if (query?.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query?.targetEntity) where.targetEntity = query.targetEntity;

    return this.prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: query?.limit || 100,
    });
  }
}
