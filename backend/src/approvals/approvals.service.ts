import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ReviewApprovalDto } from './dto/review-approval.dto';
import Decimal from 'decimal.js';
import {
  ApprovalStatus,
  EntryType,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPending(user: AuthenticatedUser) {
    return this.prisma.approvalRequest.findMany({
      where: { status: ApprovalStatus.PENDING },
      include: {
        maker: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(id: string, dto: ReviewApprovalDto, user: AuthenticatedUser) {
    const approval = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: { maker: true },
    });

    if (!approval) {
      throw new NotFoundException(`Approval request ${id} not found.`);
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(`Approval request is already in status ${approval.status}.`);
    }

    // Separation of Duties Enforcement: Maker CANNOT approve their own request!
    if (approval.makerId === user.userId) {
      throw new ForbiddenException(
        'Dual-Control Violation: Maker cannot approve their own request. A distinct authorized checker is required.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Execute the operation if it is a pending high-value transfer
      let executionResult: any = null;

      if (
        approval.action === 'APPROVE_HIGH_VALUE_TRANSFER' &&
        approval.payload
      ) {
        const payload: any = approval.payload;
        const sourceWhere = payload?.sourceAccountId
          ? { id: payload.sourceAccountId }
          : payload?.sourceAccountNumber
          ? { accountNumber: payload.sourceAccountNumber }
          : null;
        const destWhere = payload?.destinationAccountId
          ? { id: payload.destinationAccountId }
          : payload?.destinationAccountNumber
          ? { accountNumber: payload.destinationAccountNumber }
          : null;

        const source = sourceWhere ? await tx.bankAccount.findUnique({ where: sourceWhere }) : null;
        const dest = destWhere ? await tx.bankAccount.findUnique({ where: destWhere }) : null;

        if (!source || !dest) {
          throw new NotFoundException('Source or destination account for transfer cannot be resolved or no longer exists.');
        }

        const amount = new Decimal(payload.amount);
        const sourceAvail = new Decimal(source.availableBalance);

        if (sourceAvail.lessThan(amount)) {
          throw new BadRequestException(
            `Insufficient funds for approval execution: Source has $${sourceAvail.toFixed(2)}, required $${amount.toFixed(2)}.`,
          );
        }

        // Deduct source
        const newSourceBal = new Decimal(source.balance).minus(amount);
        const newSourceAvail = sourceAvail.minus(amount);
        await tx.bankAccount.update({
          where: { id: source.id },
          data: {
            balance: newSourceBal.toFixed(4),
            availableBalance: newSourceAvail.toFixed(4),
          },
        });

        // Credit dest
        const newDestBal = new Decimal(dest.balance).plus(amount);
        const newDestAvail = new Decimal(dest.availableBalance).plus(amount);
        await tx.bankAccount.update({
          where: { id: dest.id },
          data: {
            balance: newDestBal.toFixed(4),
            availableBalance: newDestAvail.toFixed(4),
          },
        });

        const referenceNumber = `TX-APPR-${Date.now()}`;
        const transaction = await tx.transaction.create({
          data: {
            referenceNumber,
            sourceAccountId: source.id,
            destinationAccountId: dest.id,
            transactionType: TransactionType.TRANSFER,
            amount: amount.toFixed(4),
            status: TransactionStatus.COMPLETED,
            description: `Maker-Checker Approved: ${payload.description || 'High-value transfer'}`,
          },
        });

        // Double-entry GL posting
        const sourceGlCode = source.accountType === 'SAVINGS' ? '2010' : '2020';
        const destGlCode = dest.accountType === 'SAVINGS' ? '2010' : '2020';

        const sourceGL = await tx.ledgerAccount.findUnique({ where: { code: sourceGlCode } });
        const destGL = await tx.ledgerAccount.findUnique({ where: { code: destGlCode } });

        if (sourceGL && destGL) {
          await tx.journalEntry.create({
            data: {
              entryNumber: `JE-APPR-${Date.now()}`,
              transactionId: transaction.id,
              description: `Approved transfer ${source.accountNumber} -> ${dest.accountNumber}`,
              isBalanced: true,
              journalLines: {
                create: [
                  {
                    ledgerAccountId: sourceGL.id,
                    entryType: EntryType.DEBIT,
                    amount: amount.toFixed(4),
                    memo: `Debit ${source.accountNumber}`,
                  },
                  {
                    ledgerAccountId: destGL.id,
                    entryType: EntryType.CREDIT,
                    amount: amount.toFixed(4),
                    memo: `Credit ${dest.accountNumber}`,
                  },
                ],
              },
            },
          });
        }

        executionResult = { transactionId: transaction.id, referenceNumber };
      }

      const updated = await tx.approvalRequest.update({
        where: { id },
        data: {
          status: ApprovalStatus.APPROVED,
          checkerId: user.userId,
          reviewNotes: dto.reviewNotes,
          reviewedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          action: 'MAKER_CHECKER_APPROVAL_GRANTED',
          targetEntity: 'ApprovalRequest',
          targetEntityId: id,
          metadata: {
            makerId: approval.makerId,
            checkerId: user.userId,
            action: approval.action,
            reviewNotes: dto.reviewNotes,
            executionResult,
          },
        },
      });

      return {
        approval: updated,
        executionResult,
      };
    });
  }

  async reject(id: string, dto: ReviewApprovalDto, user: AuthenticatedUser) {
    const approval = await this.prisma.approvalRequest.findUnique({
      where: { id },
    });

    if (!approval) {
      throw new NotFoundException(`Approval request ${id} not found.`);
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(`Approval request is already ${approval.status}.`);
    }

    if (approval.makerId === user.userId) {
      throw new ForbiddenException(
        'Dual-Control Violation: A distinct authorized checker is required to review or reject this request.',
      );
    }

    const updated = await this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: ApprovalStatus.REJECTED,
        checkerId: user.userId,
        reviewNotes: dto.reviewNotes,
        reviewedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.userId,
        action: 'MAKER_CHECKER_APPROVAL_REJECTED',
        targetEntity: 'ApprovalRequest',
        targetEntityId: id,
        metadata: {
          makerId: approval.makerId,
          checkerId: user.userId,
          rejectionReason: dto.reviewNotes,
        },
      },
    });

    return updated;
  }
}
