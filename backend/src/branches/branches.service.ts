import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.branch.findMany({
      include: {
        _count: {
          select: {
            employees: true,
            bankAccounts: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.branch.findUnique({
      where: { id },
      include: {
        employees: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        _count: { select: { bankAccounts: true } },
      },
    });
  }
}
