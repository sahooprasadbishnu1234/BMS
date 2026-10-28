import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawalDto } from './dto/withdrawal.dto';
import { TransferDto } from './dto/transfer.dto';
import Decimal from 'decimal.js';
import {
  AccountStatus,
  ApprovalEntityType,
  ApprovalStatus,
  ComplianceSeverity,
  ComplianceStatus,
  EntryType,
  NotificationType,
  TellerSessionStatus,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser, query?: { type?: TransactionType; search?: string }) {
    const where: any = {};

    if (query?.type) {
      where.transactionType = query.type;
    }

    if (query?.search) {
      where.OR = [
        { referenceNumber: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (user.roles.includes('CUSTOMER')) {
      if (!user.customerId) {
        throw new ForbiddenException('No customer profile associated.');
      }
      where.OR = [
        { sourceAccount: { customerId: user.customerId } },
        { destinationAccount: { customerId: user.customerId } },
      ];
    } else if (
      (user.roles.includes('BRANCH_MANAGER') ||
        user.roles.includes('BANK_TELLER')) &&
      !user.roles.includes('BANK_MANAGER') &&
      user.branchId
    ) {
      where.OR = [
        { sourceAccount: { branchId: user.branchId } },
        { destinationAccount: { branchId: user.branchId } },
      ];
    }

    return this.prisma.transaction.findMany({
      where,
      include: {
        sourceAccount: { select: { id: true, accountNumber: true, accountType: true } },
        destinationAccount: { select: { id: true, accountNumber: true, accountType: true } },
      },
      orderBy: { executedAt: 'desc' },
      take: 100,
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        sourceAccount: {
          include: { customer: { include: { user: true } }, branch: true },
        },
        destinationAccount: {
          include: { customer: { include: { user: true } }, branch: true },
        },
        journalEntry: {
          include: { journalLines: { include: { ledgerAccount: true } } },
        },
        tellerSession: { include: { teller: { include: { user: true } } } },
      },
    });

    if (!tx) {
      throw new NotFoundException(`Transaction ${id} not found.`);
    }

    return tx;
  }

  async processDeposit(dto: DepositDto, user: AuthenticatedUser, idempotencyKey?: string) {
    if (!user.roles.includes('BANK_TELLER') && !user.roles.includes('BRANCH_MANAGER')) {
      throw new ForbiddenException('Only teller or authorized branch staff can process cash deposits.');
    }

    // Check active teller session
    const activeSession = await this.prisma.tellerSession.findFirst({
      where: {
        teller: { userId: user.userId },
        status: TellerSessionStatus.OPEN,
      },
    });

    if (!activeSession) {
      throw new BadRequestException('You do not have an active open teller session to process cash.');
    }

    const depositAmount = new Decimal(dto.amount);
    if (depositAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Deposit amount must be strictly greater than 0.');
    }

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.bankAccount.findUnique({
        where: { accountNumber: dto.accountNumber },
      });

      if (!account) {
        throw new NotFoundException(`Account ${dto.accountNumber} not found.`);
      }

      if (account.status !== AccountStatus.ACTIVE) {
        throw new BadRequestException(`Account is ${account.status}. Deposits not permitted.`);
      }

      const newBalance = new Decimal(account.balance).plus(depositAmount);
      const newAvail = account.accountType === 'SAVINGS'
        ? Decimal.max(0, newBalance.minus(500))
        : newBalance;

      const updatedAccount = await tx.bankAccount.update({
        where: { id: account.id },
        data: {
          balance: newBalance.toFixed(4),
          availableBalance: newAvail.toFixed(4),
        },
      });

      // Update teller cash drawer
      const newExpectedCash = new Decimal(activeSession.expectedCash).plus(depositAmount);
      await tx.tellerSession.update({
        where: { id: activeSession.id },
        data: { expectedCash: newExpectedCash.toFixed(4) },
      });

      const referenceNumber = `TX-DEP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

      const transaction = await tx.transaction.create({
        data: {
          referenceNumber,
          destinationAccountId: account.id,
          tellerSessionId: activeSession.id,
          transactionType: TransactionType.DEPOSIT,
          amount: depositAmount.toFixed(4),
          status: TransactionStatus.COMPLETED,
          description: dto.description || 'Over-the-counter Cash Deposit',
          idempotencyKey,
        },
      });

      // Post General Ledger lines:
      // DEBIT 1010 (Cash in Vault)
      // CREDIT 2010/2020 (Customer Deposits)
      const cashVault = await tx.ledgerAccount.findUnique({ where: { code: '1010' } });
      const glCode = account.accountType === 'SAVINGS' ? '2010' : '2020';
      const depositGL = await tx.ledgerAccount.findUnique({ where: { code: glCode } });

      if (cashVault && depositGL) {
        await tx.journalEntry.create({
          data: {
            entryNumber: `JE-DEP-${Date.now()}`,
            transactionId: transaction.id,
            description: `Deposit to ${account.accountNumber}`,
            isBalanced: true,
            journalLines: {
              create: [
                {
                  ledgerAccountId: cashVault.id,
                  entryType: EntryType.DEBIT,
                  amount: depositAmount.toFixed(4),
                  memo: 'Cash in drawer increment',
                },
                {
                  ledgerAccountId: depositGL.id,
                  entryType: EntryType.CREDIT,
                  amount: depositAmount.toFixed(4),
                  memo: 'Customer balance liability credit',
                },
              ],
            },
          },
        });
      }

      // Check AML threshold ($10,000)
      if (depositAmount.greaterThanOrEqualTo(10000)) {
        await tx.complianceCase.create({
          data: {
            caseNumber: `CMP-${Date.now()}`,
            customerId: account.customerId,
            transactionId: transaction.id,
            alertType: 'LARGE_CASH_DEPOSIT',
            severity: ComplianceSeverity.MEDIUM,
            status: ComplianceStatus.OPEN,
            findings: `Over-the-counter cash deposit of $${depositAmount.toFixed(2)} exceeds standard CTR reporting limit.`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          action: 'DEPOSIT_PROCESSED',
          targetEntity: 'Transaction',
          targetEntityId: transaction.id,
          metadata: {
            accountNumber: account.accountNumber,
            amount: depositAmount.toFixed(4),
            tellerSessionId: activeSession.id,
          },
        },
      });

      return {
        transaction,
        receipt: {
          receiptNumber: referenceNumber,
          date: new Date(),
          type: 'DEPOSIT',
          accountNumber: account.accountNumber,
          amount: depositAmount.toFixed(2),
          newBalance: newBalance.toFixed(2),
          tellerSessionId: activeSession.id,
        },
      };
    });
  }

  async processWithdrawal(dto: WithdrawalDto, user: AuthenticatedUser, idempotencyKey?: string) {
    if (!user.roles.includes('BANK_TELLER') && !user.roles.includes('BRANCH_MANAGER')) {
      throw new ForbiddenException('Only teller or authorized branch staff can process cash withdrawals.');
    }

    const activeSession = await this.prisma.tellerSession.findFirst({
      where: {
        teller: { userId: user.userId },
        status: TellerSessionStatus.OPEN,
      },
    });

    if (!activeSession) {
      throw new BadRequestException('You do not have an active open teller session to process withdrawals.');
    }

    const withdrawAmount = new Decimal(dto.amount);
    if (withdrawAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Withdrawal amount must be strictly greater than 0.');
    }

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.bankAccount.findUnique({
        where: { accountNumber: dto.accountNumber },
      });

      if (!account) {
        throw new NotFoundException(`Account ${dto.accountNumber} not found.`);
      }

      if (account.status !== AccountStatus.ACTIVE) {
        throw new BadRequestException(`Account is ${account.status}. Withdrawals not permitted.`);
      }

      const minRequired = account.accountType === 'SAVINGS' ? new Decimal(500) : new Decimal(0);
      const currentBalance = new Decimal(account.balance);
      const maxWithdrawable = Decimal.max(0, currentBalance.minus(minRequired));

      if (withdrawAmount.greaterThan(maxWithdrawable)) {
        if (account.accountType === 'SAVINGS') {
          throw new BadRequestException(
            `Minimum balance requirement: ₹500.00 must always be maintained in your Savings Account. Your current balance is ₹${currentBalance.toFixed(2)}, so maximum withdrawable amount is ₹${maxWithdrawable.toFixed(2)}.`,
          );
        } else {
          throw new BadRequestException(
            `Insufficient funds: Available balance is ₹${maxWithdrawable.toFixed(2)}, requested ₹${withdrawAmount.toFixed(2)}.`,
          );
        }
      }

      const newBalance = currentBalance.minus(withdrawAmount);
      const newAvail = account.accountType === 'SAVINGS'
        ? Decimal.max(0, newBalance.minus(500))
        : newBalance;

      await tx.bankAccount.update({
        where: { id: account.id },
        data: {
          balance: newBalance.toFixed(4),
          availableBalance: newAvail.toFixed(4),
        },
      });

      // Update teller cash drawer
      const newExpectedCash = new Decimal(activeSession.expectedCash).minus(withdrawAmount);
      await tx.tellerSession.update({
        where: { id: activeSession.id },
        data: { expectedCash: newExpectedCash.toFixed(4) },
      });

      const referenceNumber = `TX-WTH-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

      const transaction = await tx.transaction.create({
        data: {
          referenceNumber,
          sourceAccountId: account.id,
          tellerSessionId: activeSession.id,
          transactionType: TransactionType.WITHDRAWAL,
          amount: withdrawAmount.toFixed(4),
          status: TransactionStatus.COMPLETED,
          description: dto.description || 'Over-the-counter Cash Withdrawal',
          idempotencyKey,
        },
      });

      // Post General Ledger lines:
      // DEBIT 2010/2020 (Customer Deposits)
      // CREDIT 1010 (Cash in Vault)
      const cashVault = await tx.ledgerAccount.findUnique({ where: { code: '1010' } });
      const glCode = account.accountType === 'SAVINGS' ? '2010' : '2020';
      const depositGL = await tx.ledgerAccount.findUnique({ where: { code: glCode } });

      if (cashVault && depositGL) {
        await tx.journalEntry.create({
          data: {
            entryNumber: `JE-WTH-${Date.now()}`,
            transactionId: transaction.id,
            description: `Withdrawal from ${account.accountNumber}`,
            isBalanced: true,
            journalLines: {
              create: [
                {
                  ledgerAccountId: depositGL.id,
                  entryType: EntryType.DEBIT,
                  amount: withdrawAmount.toFixed(4),
                  memo: 'Customer balance liability deduction',
                },
                {
                  ledgerAccountId: cashVault.id,
                  entryType: EntryType.CREDIT,
                  amount: withdrawAmount.toFixed(4),
                  memo: 'Cash in drawer disbursement',
                },
              ],
            },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          action: 'WITHDRAWAL_PROCESSED',
          targetEntity: 'Transaction',
          targetEntityId: transaction.id,
          metadata: {
            accountNumber: account.accountNumber,
            amount: withdrawAmount.toFixed(4),
          },
        },
      });

      return {
        transaction,
        receipt: {
          receiptNumber: referenceNumber,
          date: new Date(),
          type: 'WITHDRAWAL',
          accountNumber: account.accountNumber,
          amount: withdrawAmount.toFixed(2),
          newBalance: newBalance.toFixed(2),
          tellerSessionId: activeSession.id,
        },
      };
    });
  }

  async processTransfer(dto: TransferDto, user: AuthenticatedUser, idempotencyKey?: string) {
    if (dto.sourceAccountNumber === dto.destinationAccountNumber) {
      throw new BadRequestException('Cannot transfer funds to the same account.');
    }

    const transferAmount = new Decimal(dto.amount);
    if (transferAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Transfer amount must be strictly greater than 0.');
    }

    // Check Idempotency key if supplied
    if (idempotencyKey) {
      const existingKey = await this.prisma.idempotencyRecord.findUnique({
        where: { key: idempotencyKey },
      });
      if (existingKey) {
        return existingKey.responseBody;
      }
    }

    // First find accounts
    const sourceAcc = await this.prisma.bankAccount.findUnique({
      where: { accountNumber: dto.sourceAccountNumber },
    });
    const destAcc = await this.prisma.bankAccount.findUnique({
      where: { accountNumber: dto.destinationAccountNumber },
    });

    if (!sourceAcc) {
      throw new NotFoundException(`Source account ${dto.sourceAccountNumber} not found.`);
    }
    if (!destAcc) {
      throw new NotFoundException(`Destination account ${dto.destinationAccountNumber} not found.`);
    }

    // Ownership check for customer
    if (user.roles.includes('CUSTOMER') && sourceAcc.customerId !== user.customerId) {
      throw new ForbiddenException('You can only transfer funds from your own accounts.');
    }

    if (sourceAcc.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(`Source account is ${sourceAcc.status}.`);
    }
    if (destAcc.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(`Destination account is ${destAcc.status}.`);
    }

    // Check Maker-Checker threshold ($10,000)
    if (transferAmount.greaterThan(10000)) {
      const approval = await this.prisma.approvalRequest.create({
        data: {
          entityType: ApprovalEntityType.TRANSACTION,
          entityId: `temp-transfer-${Date.now()}`,
          action: 'APPROVE_HIGH_VALUE_TRANSFER',
          makerId: user.userId,
          status: ApprovalStatus.PENDING,
          monetaryValue: transferAmount.toFixed(4),
          reason: `Transfer of $${transferAmount.toFixed(2)} from ${sourceAcc.accountNumber} to ${destAcc.accountNumber} exceeds threshold ($10,000).`,
          payload: {
            sourceAccountId: sourceAcc.id,
            destinationAccountId: destAcc.id,
            amount: transferAmount.toNumber(),
            description: dto.description,
          },
        },
      });

      // In-app notification to managers
      const managers = await this.prisma.user.findMany({
        where: {
          userRoles: {
            some: {
              role: {
                name: { in: ['BANK_MANAGER', 'BRANCH_MANAGER'] },
              },
            },
          },
        },
      });

      for (const m of managers) {
        await this.prisma.notification.create({
          data: {
            userId: m.id,
            title: 'High-Value Transfer Pending Approval',
            message: `Transfer of $${transferAmount.toFixed(2)} submitted by ${user.email} requires authorization.`,
            type: NotificationType.APPROVAL,
          },
        });
      }

      return {
        status: 'PENDING_APPROVAL',
        message: 'Transfer amount exceeds $10,000 threshold and has been submitted to Maker-Checker queue.',
        approvalId: approval.id,
        monetaryValue: transferAmount.toFixed(2),
      };
    }

    // Deterministic Lock Ordering: min(id, id) then max(id, id)
    const [firstId, secondId] = [sourceAcc.id, destAcc.id].sort();

    const response = await this.prisma.$transaction(async (tx) => {
      // Pessimistic ordered locks
      await tx.$queryRawUnsafe(
        `SELECT "id" FROM "BankAccount" WHERE "id" IN ($1, $2) ORDER BY "id" ASC FOR UPDATE`,
        firstId,
        secondId,
      );

      const freshSource = await tx.bankAccount.findUnique({ where: { id: sourceAcc.id } });
      const freshDest = await tx.bankAccount.findUnique({ where: { id: destAcc.id } });

      if (!freshSource || !freshDest) {
        throw new NotFoundException('Accounts locked could not be retrieved.');
      }

      const minRequired = freshSource.accountType === 'SAVINGS' ? new Decimal(500) : new Decimal(0);
      const currentSourceBal = new Decimal(freshSource.balance);
      const maxTransferable = Decimal.max(0, currentSourceBal.minus(minRequired));

      if (transferAmount.greaterThan(maxTransferable)) {
        if (freshSource.accountType === 'SAVINGS') {
          throw new BadRequestException(
            `Minimum balance requirement: ₹500.00 must always be maintained in your Savings Account. Your current balance is ₹${currentSourceBal.toFixed(2)}, so maximum transferable amount is ₹${maxTransferable.toFixed(2)}.`,
          );
        } else {
          throw new BadRequestException(
            `Insufficient funds: Available balance is ₹${maxTransferable.toFixed(2)}, required ₹${transferAmount.toFixed(2)}.`,
          );
        }
      }

      // Deduct source (maintaining 500 reserve if SAVINGS)
      const newSourceBal = currentSourceBal.minus(transferAmount);
      const newSourceAvail = freshSource.accountType === 'SAVINGS'
        ? Decimal.max(0, newSourceBal.minus(500))
        : newSourceBal;

      await tx.bankAccount.update({
        where: { id: freshSource.id },
        data: {
          balance: newSourceBal.toFixed(4),
          availableBalance: newSourceAvail.toFixed(4),
        },
      });

      // Credit destination
      const newDestBal = new Decimal(freshDest.balance).plus(transferAmount);
      const newDestAvail = freshDest.accountType === 'SAVINGS'
        ? Decimal.max(0, newDestBal.minus(500))
        : newDestBal;

      await tx.bankAccount.update({
        where: { id: freshDest.id },
        data: {
          balance: newDestBal.toFixed(4),
          availableBalance: newDestAvail.toFixed(4),
        },
      });

      const referenceNumber = `TX-TRF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

      const transaction = await tx.transaction.create({
        data: {
          referenceNumber,
          sourceAccountId: freshSource.id,
          destinationAccountId: freshDest.id,
          transactionType: TransactionType.TRANSFER,
          amount: transferAmount.toFixed(4),
          status: TransactionStatus.COMPLETED,
          description: dto.description || 'Internal Account Funds Transfer',
          idempotencyKey,
        },
      });

      // Double-entry GL posting
      const sourceGlCode = freshSource.accountType === 'SAVINGS' ? '2010' : '2020';
      const destGlCode = freshDest.accountType === 'SAVINGS' ? '2010' : '2020';

      const sourceGL = await tx.ledgerAccount.findUnique({ where: { code: sourceGlCode } });
      const destGL = await tx.ledgerAccount.findUnique({ where: { code: destGlCode } });

      if (sourceGL && destGL) {
        await tx.journalEntry.create({
          data: {
            entryNumber: `JE-TRF-${Date.now()}`,
            transactionId: transaction.id,
            description: `Transfer ${freshSource.accountNumber} -> ${freshDest.accountNumber}`,
            isBalanced: true,
            journalLines: {
              create: [
                {
                  ledgerAccountId: sourceGL.id,
                  entryType: EntryType.DEBIT,
                  amount: transferAmount.toFixed(4),
                  memo: `Debit ${freshSource.accountNumber}`,
                },
                {
                  ledgerAccountId: destGL.id,
                  entryType: EntryType.CREDIT,
                  amount: transferAmount.toFixed(4),
                  memo: `Credit ${freshDest.accountNumber}`,
                },
              ],
            },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          action: 'TRANSFER_EXECUTED',
          targetEntity: 'Transaction',
          targetEntityId: transaction.id,
          metadata: {
            source: freshSource.accountNumber,
            destination: freshDest.accountNumber,
            amount: transferAmount.toFixed(4),
          },
        },
      });

      return {
        status: 'COMPLETED',
        transaction,
        sourceBalance: newSourceBal.toFixed(2),
        referenceNumber,
      };
    });

    // Record idempotency result if key was provided
    if (idempotencyKey) {
      await this.prisma.idempotencyRecord.create({
        data: {
          key: idempotencyKey,
          userId: user.userId,
          method: 'POST',
          endpoint: '/api/v1/transfers',
          statusCode: 200,
          responseBody: response as any,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    }

    return response;
  }
}
