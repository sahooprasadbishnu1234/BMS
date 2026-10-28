import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountStatusDto } from './dto/update-status.dto';
import { AccountStatus } from '@prisma/client';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser, query?: { search?: string; status?: AccountStatus }) {
    const where: any = {};

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.search) {
      where.OR = [
        { accountNumber: { contains: query.search, mode: 'insensitive' } },
        { customer: { customerNumber: { contains: query.search, mode: 'insensitive' } } },
        {
          customer: {
            user: {
              OR: [
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    // Role-based scoping
    if (user.roles.includes('CUSTOMER')) {
      if (!user.customerId) {
        throw new ForbiddenException('No associated customer profile found.');
      }
      where.customerId = user.customerId;
    } else if (
      (user.roles.includes('BRANCH_MANAGER') ||
        user.roles.includes('BANK_TELLER') ||
        user.roles.includes('LOAN_OFFICER')) &&
      !user.roles.includes('BANK_MANAGER') &&
      !user.roles.includes('SYSTEM_ADMINISTRATOR')
    ) {
      if (user.branchId) {
        where.branchId = user.branchId;
      }
    }

    return this.prisma.bankAccount.findMany({
      where,
      include: {
        customer: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        branch: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const account = await this.prisma.bankAccount.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            addresses: true,
          },
        },
        branch: true,
      },
    });

    if (!account) {
      throw new NotFoundException(`Bank account with ID ${id} not found.`);
    }

    // Scoping enforcement
    if (user.roles.includes('CUSTOMER') && account.customerId !== user.customerId) {
      throw new ForbiddenException('You are not authorized to view this account.');
    }

    if (
      (user.roles.includes('BRANCH_MANAGER') ||
        user.roles.includes('BANK_TELLER') ||
        user.roles.includes('LOAN_OFFICER')) &&
      !user.roles.includes('BANK_MANAGER') &&
      user.branchId &&
      account.branchId !== user.branchId
    ) {
      throw new ForbiddenException('You cannot access accounts from other branches.');
    }

    return account;
  }

  async create(createDto: CreateAccountDto, user: AuthenticatedUser) {
    let targetCustomerId = user.customerId;

    // Staff can open on behalf of customer
    if (!user.roles.includes('CUSTOMER')) {
      if (!createDto.customerId) {
        throw new BadRequestException('Staff must specify customerId when opening an account.');
      }
      targetCustomerId = createDto.customerId;
    }

    if (!targetCustomerId) {
      throw new BadRequestException('Target customer identifier is required.');
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: targetCustomerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found.');
    }

    const branchId = createDto.branchId || user.branchId;
    const branch = await this.prisma.branch.findFirst({
      where: branchId ? { id: branchId } : undefined,
    });

    if (!branch) {
      throw new BadRequestException('Valid branch identifier required.');
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const accountNumber = `100500${randomSuffix}${Math.floor(10 + Math.random() * 90)}`;
    const isSavings = createDto.accountType === 'SAVINGS';
    const depositAmount = createDto.initialDeposit !== undefined
      ? Number(createDto.initialDeposit)
      : (isSavings ? 500 : 0);

    if (isSavings && depositAmount < 500) {
      throw new BadRequestException('A minimum initial deposit of ₹500.00 is required to open a Savings Account.');
    }
    if (!isSavings && depositAmount < 0) {
      throw new BadRequestException('Initial deposit for a Current Account cannot be negative.');
    }

    const availableAmount = isSavings ? Math.max(0, depositAmount - 500) : depositAmount;

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.bankAccount.create({
        data: {
          accountNumber,
          customerId: targetCustomerId,
          branchId: branch.id,
          accountType: createDto.accountType,
          status: AccountStatus.ACTIVE,
          balance: depositAmount.toFixed(4),
          availableBalance: availableAmount.toFixed(4),
        },
      });

      if (depositAmount > 0) {
        const cashVault = await tx.ledgerAccount.findUnique({ where: { code: '1010' } });
        const glCode = createDto.accountType === 'SAVINGS' ? '2010' : '2020';
        const depositGL = await tx.ledgerAccount.findUnique({ where: { code: glCode } });

        if (cashVault && depositGL) {
          await tx.journalEntry.create({
            data: {
              entryNumber: `JE-ACC-${Date.now()}`,
              description: `Initial deposit for new account ${account.accountNumber}`,
              isBalanced: true,
              journalLines: {
                create: [
                  { ledgerAccountId: cashVault.id, entryType: 'DEBIT', amount: depositAmount.toFixed(4), memo: 'Opening cash vault deposit' },
                  { ledgerAccountId: depositGL.id, entryType: 'CREDIT', amount: depositAmount.toFixed(4), memo: 'Customer deposit liability' },
                ],
              },
            },
          });

          await tx.transaction.create({
            data: {
              referenceNumber: `TX-ACC-${Date.now()}`,
              destinationAccountId: account.id,
              transactionType: 'DEPOSIT',
              amount: depositAmount.toFixed(4),
              status: 'COMPLETED',
              description: 'Account Opening Deposit',
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          action: 'ACCOUNT_OPENED',
          targetEntity: 'BankAccount',
          targetEntityId: account.id,
          metadata: { accountNumber: account.accountNumber, type: account.accountType },
        },
      });

      return account;
    });
  }

  async updateStatus(id: string, updateDto: UpdateAccountStatusDto, user: AuthenticatedUser) {
    const account = await this.prisma.bankAccount.findUnique({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Account ${id} not found.`);
    }

    if (account.status === updateDto.status) {
      throw new BadRequestException(`Account is already in status ${updateDto.status}.`);
    }

    const updated = await this.prisma.bankAccount.update({
      where: { id },
      data: {
        status: updateDto.status,
        closedAt: updateDto.status === AccountStatus.CLOSED ? new Date() : null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.userId,
        action: `ACCOUNT_STATUS_${updateDto.status}`,
        targetEntity: 'BankAccount',
        targetEntityId: id,
        metadata: {
          previousStatus: account.status,
          newStatus: updateDto.status,
          reason: updateDto.reason,
        },
      },
    });

    return updated;
  }

  async getStatement(
    id: string,
    user: AuthenticatedUser,
    startDate?: string | Date,
    endDate?: string | Date,
  ) {
    const account = await this.findOne(id, user);

    const whereTx: any = {
      OR: [{ sourceAccountId: id }, { destinationAccountId: id }],
      status: 'COMPLETED',
    };

    if (startDate || endDate) {
      whereTx.executedAt = {};
      if (startDate) {
        const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate.getTime());
        if (typeof startDate === 'string' && !startDate.includes('T')) {
          start.setUTCHours(0, 0, 0, 0);
        }
        whereTx.executedAt.gte = start;
      }
      if (endDate) {
        const end = typeof endDate === 'string' ? new Date(endDate) : new Date(endDate.getTime());
        if (typeof endDate === 'string' && !endDate.includes('T')) {
          end.setUTCHours(23, 59, 59, 999);
        } else if (end.getUTCHours() === 0 && end.getUTCMinutes() === 0 && end.getUTCSeconds() === 0) {
          end.setUTCHours(23, 59, 59, 999);
        }
        whereTx.executedAt.lte = end;
      }
    }

    const transactions = await this.prisma.transaction.findMany({
      where: whereTx,
      orderBy: { executedAt: 'desc' },
      take: 100,
    });

    const txList = transactions.map((tx) => ({
      id: tx.id,
      referenceNumber: tx.referenceNumber,
      type: tx.transactionType,
      direction: tx.sourceAccountId === id ? 'DEBIT' : 'CREDIT',
      amount: tx.amount,
      fee: tx.fee,
      description: tx.description,
      date: tx.executedAt,
    }));

    const totalCredit = txList
      .filter((t) => t.direction === 'CREDIT')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalDebit = txList
      .filter((t) => t.direction === 'DEBIT')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    return {
      account: {
        id: account.id,
        accountNumber: account.accountNumber,
        accountType: account.accountType,
        currency: account.currency,
        currentBalance: account.balance,
        availableBalance: account.availableBalance,
        status: account.status,
        customerName: `${account.customer.user.firstName} ${account.customer.user.lastName}`,
        branchName: account.branch.name,
      },
      period: {
        startDate: startDate ? (typeof startDate === 'string' ? startDate : startDate.toISOString()) : null,
        endDate: endDate ? (typeof endDate === 'string' ? endDate : endDate.toISOString()) : null,
      },
      summary: {
        totalCredit,
        totalDebit,
        netFlow: totalCredit - totalDebit,
        transactionCount: txList.length,
      },
      transactions: txList,
    };
  }
}

