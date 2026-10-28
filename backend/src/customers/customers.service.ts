import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import * as argon2 from 'argon2';
import { KycStatus, UserStatus, AccountStatus, AccountType } from '@prisma/client';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    search?: string;
    kycStatus?: KycStatus;
    status?: UserStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.kycStatus) {
      where.kycStatus = params.kycStatus;
    }

    if (params.status) {
      where.user = { ...where.user, status: params.status };
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { customerNumber: { contains: q, mode: 'insensitive' } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { phone: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, customers] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              status: true,
              lastLoginAt: true,
              createdAt: true,
            },
          },
          bankAccounts: {
            select: {
              id: true,
              accountNumber: true,
              accountType: true,
              status: true,
              balance: true,
              availableBalance: true,
              branch: { select: { id: true, code: true, name: true } },
            },
          },
        },
      }),
    ]);

    return {
      data: customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        OR: [{ id }, { customerNumber: id }, { userId: id }],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        addresses: true,
        bankAccounts: {
          include: {
            branch: { select: { id: true, code: true, name: true } },
          },
        },
        loanApplications: {
          take: 5,
          orderBy: { submittedAt: 'desc' },
          include: { loanProduct: true },
        },
        supportTickets: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer record ${id} not found.`);
    }

    return customer;
  }

  async create(dto: CreateCustomerDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });

    if (existing) {
      throw new ConflictException(`An account with email ${dto.email} already exists.`);
    }

    const customerRole = await this.prisma.role.findUnique({
      where: { name: 'CUSTOMER' },
    });

    if (!customerRole) {
      throw new BadRequestException('Role CUSTOMER not found in system.');
    }

    // Branch selection
    const defaultBranch = dto.branchId
      ? await this.prisma.branch.findUnique({ where: { id: dto.branchId } })
      : await this.prisma.branch.findFirst({ where: { code: 'BR-001' } });

    if (!defaultBranch) {
      throw new BadRequestException('Valid branch required for account opening.');
    }

    const rawPassword = dto.password || 'Password123!';
    const passwordHash = await argon2.hash(rawPassword, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const customerNumber = `CUST-${Date.now().toString().slice(-4)}${randomSuffix}`;
    const accountNumber = `100900${randomSuffix}${Math.floor(10 + Math.random() * 90)}`;
    const targetAccountType = dto.accountType || AccountType.SAVINGS;
    const isSavings = targetAccountType === AccountType.SAVINGS;
    const depositAmount = dto.initialDeposit !== undefined
      ? Number(dto.initialDeposit)
      : (isSavings ? 500 : 0);

    if (isSavings && depositAmount < 500) {
      throw new BadRequestException('A minimum initial deposit of ₹500.00 is required to open a Savings Account.');
    }
    if (!isSavings && depositAmount < 0) {
      throw new BadRequestException('Initial deposit for a Current Account cannot be negative.');
    }

    const availableAmount = isSavings ? Math.max(0, depositAmount - 500) : depositAmount;

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.trim().toLowerCase(),
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phone: dto.phone?.trim() || null,
          status: UserStatus.ACTIVE,
          userRoles: {
            create: { roleId: customerRole.id },
          },
        },
      });

      const customer = await tx.customer.create({
        data: {
          userId: user.id,
          customerNumber,
          kycStatus: dto.kycStatus || KycStatus.PENDING,
          taxIdentifier: dto.taxIdentifier?.trim() || null,
          occupation: dto.occupation?.trim() || 'Retail Banking Customer',
          monthlyIncome: dto.monthlyIncome ? dto.monthlyIncome.toFixed(4) : null,
        },
      });

      // Create primary bank account
      const account = await tx.bankAccount.create({
        data: {
          accountNumber,
          customerId: customer.id,
          branchId: defaultBranch.id,
          accountType: targetAccountType,
          status: AccountStatus.ACTIVE,
          balance: depositAmount.toFixed(4),
          availableBalance: availableAmount.toFixed(4),
        },
      });

      // Post opening journal entry if initial deposit > 0
      if (depositAmount > 0) {
        const cashVault = await tx.ledgerAccount.findUnique({ where: { code: '1010' } });
        const depositGL = await tx.ledgerAccount.findUnique({
          where: { code: dto.accountType === 'CURRENT' ? '2020' : '2010' },
        });

        if (cashVault && depositGL) {
          await tx.journalEntry.create({
            data: {
              entryNumber: `JE-NEWCUST-${Date.now()}`,
              description: `Initial opening deposit for customer ${customerNumber}`,
              isBalanced: true,
              journalLines: {
                create: [
                  {
                    ledgerAccountId: cashVault.id,
                    entryType: 'DEBIT',
                    amount: depositAmount.toFixed(4),
                    memo: 'Branch cash deposit',
                  },
                  {
                    ledgerAccountId: depositGL.id,
                    entryType: 'CREDIT',
                    amount: depositAmount.toFixed(4),
                    memo: 'Customer account liability credit',
                  },
                ],
              },
            },
          });

          await tx.transaction.create({
            data: {
              referenceNumber: `TX-NEWCUST-${Date.now()}`,
              destinationAccountId: account.id,
              transactionType: 'DEPOSIT',
              amount: depositAmount.toFixed(4),
              status: 'COMPLETED',
              description: 'Initial Opening Balance Deposit',
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorId: actor.userId,
          action: 'CUSTOMER_CREATED',
          targetEntity: 'Customer',
          targetEntityId: customer.id,
          metadata: {
            customerNumber,
            email: user.email,
            accountNumber: account.accountNumber,
            initialDeposit: depositAmount,
          },
        },
      });

      return {
        ...customer,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          status: user.status,
        },
        bankAccounts: [account],
      };
    });
  }

  async update(id: string, dto: UpdateCustomerDto, actor: AuthenticatedUser) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        OR: [{ id }, { customerNumber: id }],
      },
      include: { user: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found.`);
    }

    const userData: any = {};
    if (dto.firstName) userData.firstName = dto.firstName.trim();
    if (dto.lastName) userData.lastName = dto.lastName.trim();
    if (dto.phone !== undefined) userData.phone = dto.phone?.trim() || null;
    if (dto.status) userData.status = dto.status;

    const customerData: any = {};
    if (dto.taxIdentifier !== undefined) customerData.taxIdentifier = dto.taxIdentifier?.trim() || null;
    if (dto.occupation !== undefined) customerData.occupation = dto.occupation?.trim() || null;
    if (dto.monthlyIncome !== undefined) customerData.monthlyIncome = dto.monthlyIncome !== null ? Number(dto.monthlyIncome).toFixed(4) : null;
    if (dto.kycStatus) customerData.kycStatus = dto.kycStatus;

    return this.prisma.$transaction(async (tx) => {
      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: customer.userId },
          data: userData,
        });
      }

      const updatedCustomer = await tx.customer.update({
        where: { id: customer.id },
        data: customerData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              status: true,
            },
          },
          bankAccounts: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.userId,
          action: 'CUSTOMER_UPDATED',
          targetEntity: 'Customer',
          targetEntityId: customer.id,
          metadata: { updates: dto as any },
        },
      });

      return updatedCustomer;
    });
  }

  async deactivate(id: string, reason: string, actor: AuthenticatedUser) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        OR: [{ id }, { customerNumber: id }],
      },
      include: { user: true, bankAccounts: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Soft-deactivate by suspending user status and freezing accounts
      const updatedUser = await tx.user.update({
        where: { id: customer.userId },
        data: { status: UserStatus.SUSPENDED },
      });

      await tx.bankAccount.updateMany({
        where: { customerId: customer.id, status: AccountStatus.ACTIVE },
        data: { status: AccountStatus.FROZEN },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.userId,
          action: 'CUSTOMER_DEACTIVATED',
          targetEntity: 'Customer',
          targetEntityId: customer.id,
          metadata: { reason, previousStatus: customer.user.status },
        },
      });

      return {
        success: true,
        message: `Customer ${customer.customerNumber} (${customer.user.firstName} ${customer.user.lastName}) has been suspended.`,
        customer: { ...customer, user: updatedUser },
      };
    });
  }

  async delete(id: string, actor: AuthenticatedUser) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        OR: [{ id }, { customerNumber: id }],
      },
      include: {
        bankAccounts: {
          include: {
            sourceTxns: { take: 1 },
            destTxns: { take: 1 },
          },
        },
        loanApplications: { take: 1 },
        supportTickets: { take: 1 },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found.`);
    }

    // Check financial history invariance
    const hasTransactions = customer.bankAccounts.some(
      (a) => a.sourceTxns.length > 0 || a.destTxns.length > 0,
    );
    const hasActiveBalance = customer.bankAccounts.some((a) => Number(a.balance) > 0);
    const hasLoans = customer.loanApplications.length > 0;

    if (hasTransactions || hasActiveBalance || hasLoans) {
      throw new BadRequestException(
        'Financial compliance violation: Customer has existing transaction, ledger, or loan records and cannot be permanently deleted. Use Deactivate/Suspend to revoke access while preserving financial history.',
      );
    }

    // Safe deletion for zero-activity records
    return this.prisma.$transaction(async (tx) => {
      await tx.bankAccount.deleteMany({ where: { customerId: customer.id } });
      await tx.address.deleteMany({ where: { customerId: customer.id } });
      await tx.customer.delete({ where: { id: customer.id } });
      await tx.userRole.deleteMany({ where: { userId: customer.userId } });
      await tx.user.delete({ where: { id: customer.userId } });

      await tx.auditLog.create({
        data: {
          actorId: actor.userId,
          action: 'CUSTOMER_PURGED',
          targetEntity: 'Customer',
          targetEntityId: customer.id,
          metadata: { customerNumber: customer.customerNumber },
        },
      });

      return {
        success: true,
        message: `Customer record ${customer.customerNumber} deleted permanently.`,
      };
    });
  }
}
