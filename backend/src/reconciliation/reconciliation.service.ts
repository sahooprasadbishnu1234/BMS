import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { OpenSessionDto, CloseSessionDto } from './dto/session.dto';
import Decimal from 'decimal.js';
import {
  ReconciliationStatus,
  TellerSessionStatus,
} from '@prisma/client';

@Injectable()
export class ReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveSession(user: AuthenticatedUser) {
    if (!user.employeeId) {
      throw new ForbiddenException('Staff employee identity required.');
    }

    return this.prisma.tellerSession.findFirst({
      where: {
        tellerId: user.employeeId,
        status: TellerSessionStatus.OPEN,
      },
      include: {
        transactions: {
          take: 10,
          orderBy: { executedAt: 'desc' },
        },
      },
    });
  }

  async getAllSessions(user: AuthenticatedUser) {
    const where: any = {};
    if (
      user.roles.includes('BANK_TELLER') &&
      !user.roles.includes('BRANCH_MANAGER') &&
      !user.roles.includes('BANK_MANAGER')
    ) {
      where.tellerId = user.employeeId;
    } else if (user.roles.includes('BRANCH_MANAGER') && user.branchId) {
      where.branchId = user.branchId;
    }

    return this.prisma.tellerSession.findMany({
      where,
      include: {
        teller: { include: { user: { select: { firstName: true, lastName: true } } } },
        reconciliation: true,
      },
      orderBy: { openedAt: 'desc' },
      take: 50,
    });
  }

  async openSession(dto: OpenSessionDto, user: AuthenticatedUser) {
    if (!user.employeeId || !user.branchId) {
      throw new BadRequestException('Active employee assignment to branch is required.');
    }

    const existing = await this.prisma.tellerSession.findFirst({
      where: {
        tellerId: user.employeeId,
        status: TellerSessionStatus.OPEN,
      },
    });

    if (existing) {
      throw new BadRequestException('You already have an open teller session. Please close it first.');
    }

    const openingCash = new Decimal(dto.openingCash);

    const session = await this.prisma.tellerSession.create({
      data: {
        tellerId: user.employeeId,
        branchId: user.branchId,
        openingCash: openingCash.toFixed(4),
        expectedCash: openingCash.toFixed(4),
        status: TellerSessionStatus.OPEN,
        notes: dto.notes,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.userId,
        action: 'TELLER_SESSION_OPENED',
        targetEntity: 'TellerSession',
        targetEntityId: session.id,
        metadata: { openingCash: openingCash.toFixed(4) },
      },
    });

    return session;
  }

  async closeSession(id: string, dto: CloseSessionDto, user: AuthenticatedUser) {
    const session = await this.prisma.tellerSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException(`Session ${id} not found.`);
    }

    if (session.status !== TellerSessionStatus.OPEN) {
      throw new BadRequestException(`Session is already ${session.status}.`);
    }

    const declared = new Decimal(dto.declaredCash);
    const expected = new Decimal(session.expectedCash);
    const discrepancy = declared.minus(expected);

    const status = discrepancy.isZero()
      ? ReconciliationStatus.BALANCED
      : ReconciliationStatus.DISCREPANCY;

    return this.prisma.$transaction(async (tx) => {
      const updatedSession = await tx.tellerSession.update({
        where: { id },
        data: {
          closingCash: declared.toFixed(4),
          cashDifference: discrepancy.toFixed(4),
          status: TellerSessionStatus.CLOSED,
          closedAt: new Date(),
        },
      });

      const reconciliation = await tx.cashReconciliation.create({
        data: {
          tellerSessionId: session.id,
          branchId: session.branchId,
          declaredAmount: declared.toFixed(4),
          systemAmount: expected.toFixed(4),
          discrepancy: discrepancy.toFixed(4),
          status,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          action: 'TELLER_SESSION_CLOSED',
          targetEntity: 'TellerSession',
          targetEntityId: session.id,
          metadata: {
            declaredCash: declared.toFixed(4),
            expectedCash: expected.toFixed(4),
            discrepancy: discrepancy.toFixed(4),
          },
        },
      });

      return {
        session: updatedSession,
        reconciliation,
      };
    });
  }

  async approveReconciliation(reconciliationId: string, user: AuthenticatedUser) {
    const recon = await this.prisma.cashReconciliation.findUnique({
      where: { id: reconciliationId },
    });

    if (!recon) {
      throw new NotFoundException('Reconciliation record not found.');
    }

    return this.prisma.cashReconciliation.update({
      where: { id: reconciliationId },
      data: {
        status: ReconciliationStatus.APPROVED,
        verifiedById: user.employeeId,
      },
    });
  }
}
