import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ApplyLoanDto } from './dto/apply-loan.dto';
import { RecommendLoanDto } from './dto/recommend-loan.dto';
import { RepayLoanDto } from './dto/repay-loan.dto';
import Decimal from 'decimal.js';
import {
  EntryType,
  LoanAccountStatus,
  LoanApplicationStatus,
  RepaymentStatus,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  async getProducts() {
    return this.prisma.loanProduct.findMany({
      where: { isActive: true },
      orderBy: { annualInterestRate: 'asc' },
    });
  }

  async getApplications(user: AuthenticatedUser) {
    const where: any = {};

    if (user.roles.includes('CUSTOMER')) {
      if (!user.customerId) {
        throw new ForbiddenException('No customer profile associated.');
      }
      where.customerId = user.customerId;
    } else if (
      user.roles.includes('LOAN_OFFICER') ||
      user.roles.includes('BRANCH_MANAGER')
    ) {
      if (!user.roles.includes('BANK_MANAGER') && user.branchId) {
        where.branchId = user.branchId;
      }
    }

    return this.prisma.loanApplication.findMany({
      where,
      include: {
        loanProduct: true,
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
        loanAccount: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getApplicationById(id: string, user: AuthenticatedUser) {
    const app = await this.prisma.loanApplication.findUnique({
      where: { id },
      include: {
        loanProduct: true,
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
            bankAccounts: true,
          },
        },
        loanAccount: {
          include: {
            repayments: {
              orderBy: { installmentNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!app) {
      throw new NotFoundException(`Loan application ${id} not found.`);
    }

    if (user.roles.includes('CUSTOMER') && app.customerId !== user.customerId) {
      throw new ForbiddenException('You cannot access other customers loan applications.');
    }

    return app;
  }

  async apply(dto: ApplyLoanDto, user: AuthenticatedUser) {
    if (!user.customerId) {
      throw new BadRequestException('Only registered retail banking customers can apply for loans.');
    }

    const product = await this.prisma.loanProduct.findUnique({
      where: { code: dto.loanProductCode },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException(`Loan product ${dto.loanProductCode} is not available.`);
    }

    const reqAmt = new Decimal(dto.requestedAmount);
    if (
      reqAmt.lessThan(product.minAmount) ||
      reqAmt.greaterThan(product.maxAmount)
    ) {
      throw new BadRequestException(
        `Amount must be between $${new Decimal(product.minAmount).toFixed(2)} and $${new Decimal(product.maxAmount).toFixed(2)}.`,
      );
    }

    if (
      dto.tenureMonths < product.minTenureMonths ||
      dto.tenureMonths > product.maxTenureMonths
    ) {
      throw new BadRequestException(
        `Tenure must be between ${product.minTenureMonths} and ${product.maxTenureMonths} months.`,
      );
    }

    // Customer branch
    const customer = await this.prisma.customer.findUnique({
      where: { id: user.customerId },
      include: { bankAccounts: true },
    });

    const branchId = customer?.bankAccounts[0]?.branchId;
    if (!branchId) {
      throw new BadRequestException('Customer has no active accounts associated with a branch.');
    }

    const applicationNumber = `LN-APP-${Date.now()}`;

    const app = await this.prisma.loanApplication.create({
      data: {
        applicationNumber,
        customerId: user.customerId,
        loanProductId: product.id,
        branchId,
        requestedAmount: reqAmt.toFixed(4),
        tenureMonths: dto.tenureMonths,
        purpose: dto.purpose,
        monthlyIncome: new Decimal(dto.monthlyIncome).toFixed(4),
        status: LoanApplicationStatus.SUBMITTED,
      },
      include: { loanProduct: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.userId,
        action: 'LOAN_APPLICATION_SUBMITTED',
        targetEntity: 'LoanApplication',
        targetEntityId: app.id,
        metadata: {
          applicationNumber,
          amount: reqAmt.toFixed(4),
          tenure: dto.tenureMonths,
        },
      },
    });

    return app;
  }

  async recommend(id: string, dto: RecommendLoanDto, user: AuthenticatedUser) {
    const app = await this.prisma.loanApplication.findUnique({ where: { id } });
    if (!app) {
      throw new NotFoundException(`Loan application ${id} not found.`);
    }

    if (
      app.status !== LoanApplicationStatus.SUBMITTED &&
      app.status !== LoanApplicationStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException(`Application cannot be recommended from status ${app.status}.`);
    }

    const updated = await this.prisma.loanApplication.update({
      where: { id },
      data: {
        status: LoanApplicationStatus.RECOMMENDED,
        assignedOfficerId: user.employeeId,
        creditScore: dto.creditScore,
        recommendationNotes: dto.recommendationNotes,
        reviewedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.userId,
        action: 'LOAN_RECOMMENDATION_RECORDED',
        targetEntity: 'LoanApplication',
        targetEntityId: id,
        metadata: {
          creditScore: dto.creditScore,
          officerId: user.employeeId,
          recommendation: dto.recommendationNotes,
        },
      },
    });

    return updated;
  }

  async approve(id: string, user: AuthenticatedUser) {
    const app = await this.prisma.loanApplication.findUnique({
      where: { id },
      include: { loanProduct: true },
    });

    if (!app) {
      throw new NotFoundException(`Loan application ${id} not found.`);
    }

    if (app.status !== LoanApplicationStatus.RECOMMENDED) {
      throw new BadRequestException('Loan application must be assessed and recommended by an officer first.');
    }

    const updated = await this.prisma.loanApplication.update({
      where: { id },
      data: { status: LoanApplicationStatus.APPROVED },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.userId,
        action: 'LOAN_APPROVED_BY_MANAGER',
        targetEntity: 'LoanApplication',
        targetEntityId: id,
        metadata: { managerId: user.userId },
      },
    });

    return updated;
  }

  async disburse(id: string, user: AuthenticatedUser) {
    const app = await this.prisma.loanApplication.findUnique({
      where: { id },
      include: {
        loanProduct: true,
        customer: { include: { bankAccounts: true } },
      },
    });

    if (!app) {
      throw new NotFoundException(`Loan application ${id} not found.`);
    }

    if (app.status !== LoanApplicationStatus.APPROVED) {
      throw new BadRequestException(`Application must be APPROVED before disbursement. Current: ${app.status}.`);
    }

    const targetAccount = app.customer.bankAccounts[0];
    if (!targetAccount) {
      throw new BadRequestException('Customer has no active bank account to receive disbursement.');
    }

    const P = new Decimal(app.requestedAmount);
    const annualRate = new Decimal(app.loanProduct.annualInterestRate);
    const monthlyRate = annualRate.dividedBy(100).dividedBy(12);
    const n = app.tenureMonths;

    // Monthly EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
    const onePlusR = monthlyRate.plus(1);
    const onePlusRPowN = onePlusR.pow(n);
    const numerator = P.times(monthlyRate).times(onePlusRPowN);
    const denominator = onePlusRPowN.minus(1);
    const emi = numerator.dividedBy(denominator);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Loan Account
      const maturityDate = new Date();
      maturityDate.setMonth(maturityDate.getMonth() + n);

      const loanAccount = await tx.loanAccount.create({
        data: {
          loanNumber: `LA-${Date.now()}`,
          applicationId: app.id,
          bankAccountId: targetAccount.id,
          principalAmount: P.toFixed(4),
          interestRate: annualRate.toFixed(2),
          outstandingBalance: P.toFixed(4),
          totalTenureMonths: n,
          monthlyInstallment: emi.toFixed(4),
          maturityDate,
          status: LoanAccountStatus.ACTIVE,
        },
      });

      // 2. Generate full Amortization Schedule
      let remainingBalance = P;
      for (let i = 1; i <= n; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i);

        const interestDue = remainingBalance.times(monthlyRate);
        const principalDue = emi.minus(interestDue);
        remainingBalance = remainingBalance.minus(principalDue);

        await tx.loanRepayment.create({
          data: {
            loanAccountId: loanAccount.id,
            installmentNumber: i,
            dueDate,
            principalDue: principalDue.toFixed(4),
            interestDue: interestDue.toFixed(4),
            totalDue: emi.toFixed(4),
            amountPaid: '0.0000',
            status: RepaymentStatus.SCHEDULED,
          },
        });
      }

      // 3. Credit customer account with principal
      const newBal = new Decimal(targetAccount.balance).plus(P);
      const newAvail = new Decimal(targetAccount.availableBalance).plus(P);
      await tx.bankAccount.update({
        where: { id: targetAccount.id },
        data: {
          balance: newBal.toFixed(4),
          availableBalance: newAvail.toFixed(4),
        },
      });

      // 4. Insert Transaction
      const transaction = await tx.transaction.create({
        data: {
          referenceNumber: `TX-DISB-${Date.now()}`,
          destinationAccountId: targetAccount.id,
          transactionType: TransactionType.LOAN_DISBURSEMENT,
          amount: P.toFixed(4),
          status: TransactionStatus.COMPLETED,
          description: `Loan facility disbursement: ${loanAccount.loanNumber}`,
        },
      });

      // 5. Post General Ledger lines:
      // DEBIT 1050 (Loan Receivables Asset)
      // CREDIT 2010/2020 (Customer Deposits Liability)
      const loanAssetGL = await tx.ledgerAccount.findUnique({ where: { code: '1050' } });
      const glCode = targetAccount.accountType === 'SAVINGS' ? '2010' : '2020';
      const depositGL = await tx.ledgerAccount.findUnique({ where: { code: glCode } });

      if (loanAssetGL && depositGL) {
        await tx.journalEntry.create({
          data: {
            entryNumber: `JE-DISB-${Date.now()}`,
            transactionId: transaction.id,
            description: `Loan disbursement to ${targetAccount.accountNumber}`,
            isBalanced: true,
            journalLines: {
              create: [
                {
                  ledgerAccountId: loanAssetGL.id,
                  entryType: EntryType.DEBIT,
                  amount: P.toFixed(4),
                  memo: 'Debit commercial loan receivables',
                },
                {
                  ledgerAccountId: depositGL.id,
                  entryType: EntryType.CREDIT,
                  amount: P.toFixed(4),
                  memo: 'Credit customer checking/savings',
                },
              ],
            },
          },
        });
      }

      // 6. Update Application status
      await tx.loanApplication.update({
        where: { id: app.id },
        data: { status: LoanApplicationStatus.DISBURSED },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          action: 'LOAN_DISBURSED',
          targetEntity: 'LoanAccount',
          targetEntityId: loanAccount.id,
          metadata: {
            principal: P.toFixed(4),
            monthlyInstallment: emi.toFixed(4),
            accountNumber: targetAccount.accountNumber,
          },
        },
      });

      return {
        loanAccount,
        monthlyInstallment: emi.toFixed(2),
        accountCredited: targetAccount.accountNumber,
        newBalance: newBal.toFixed(2),
      };
    });
  }

  async repay(loanAccountId: string, dto: RepayLoanDto, user: AuthenticatedUser) {
    const loan = await this.prisma.loanAccount.findUnique({
      where: { id: loanAccountId },
      include: {
        application: { include: { customer: true } },
        repayments: {
          where: { status: { in: [RepaymentStatus.SCHEDULED, RepaymentStatus.OVERDUE] } },
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    if (!loan) {
      throw new NotFoundException(`Loan account ${loanAccountId} not found.`);
    }

    if (user.roles.includes('CUSTOMER') && loan.application.customerId !== user.customerId) {
      throw new ForbiddenException('Cannot pay loans belonging to another customer.');
    }

    const payAmount = new Decimal(dto.amount);
    if (payAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Repayment amount must be positive.');
    }

    return this.prisma.$transaction(async (tx) => {
      const source = await tx.bankAccount.findUnique({
        where: { accountNumber: dto.sourceAccountNumber },
      });

      if (!source) {
        throw new NotFoundException(`Source bank account ${dto.sourceAccountNumber} not found.`);
      }

      const avail = new Decimal(source.availableBalance);
      if (avail.lessThan(payAmount)) {
        throw new BadRequestException(`Insufficient funds: Available $${avail.toFixed(2)}, required $${payAmount.toFixed(2)}.`);
      }

      // Deduct source account
      const newBal = new Decimal(source.balance).minus(payAmount);
      const newAvail = avail.minus(payAmount);
      await tx.bankAccount.update({
        where: { id: source.id },
        data: {
          balance: newBal.toFixed(4),
          availableBalance: newAvail.toFixed(4),
        },
      });

      // Update next scheduled installment
      const nextInstallment = loan.repayments[0];
      if (nextInstallment) {
        await tx.loanRepayment.update({
          where: { id: nextInstallment.id },
          data: {
            amountPaid: payAmount.toFixed(4),
            status: RepaymentStatus.PAID,
            paidDate: new Date(),
          },
        });
      }

      // Deduct outstanding loan balance
      const newLoanBal = Decimal.max(0, new Decimal(loan.outstandingBalance).minus(payAmount));
      await tx.loanAccount.update({
        where: { id: loan.id },
        data: {
          outstandingBalance: newLoanBal.toFixed(4),
          status: newLoanBal.isZero() ? LoanAccountStatus.CLOSED : LoanAccountStatus.ACTIVE,
        },
      });

      // Post GL: DEBIT Customer Deposits, CREDIT Loan Receivables
      const loanAssetGL = await tx.ledgerAccount.findUnique({ where: { code: '1050' } });
      const glCode = source.accountType === 'SAVINGS' ? '2010' : '2020';
      const depositGL = await tx.ledgerAccount.findUnique({ where: { code: glCode } });

      if (loanAssetGL && depositGL) {
        await tx.journalEntry.create({
          data: {
            entryNumber: `JE-REPAY-${Date.now()}`,
            description: `Loan installment payment: ${loan.loanNumber}`,
            isBalanced: true,
            journalLines: {
              create: [
                {
                  ledgerAccountId: depositGL.id,
                  entryType: EntryType.DEBIT,
                  amount: payAmount.toFixed(4),
                  memo: `Repayment from ${source.accountNumber}`,
                },
                {
                  ledgerAccountId: loanAssetGL.id,
                  entryType: EntryType.CREDIT,
                  amount: payAmount.toFixed(4),
                  memo: 'Receivable asset credit reduction',
                },
              ],
            },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          action: 'LOAN_INSTALLMENT_REPAID',
          targetEntity: 'LoanAccount',
          targetEntityId: loan.id,
          metadata: {
            amountPaid: payAmount.toFixed(4),
            remainingBalance: newLoanBal.toFixed(4),
          },
        },
      });

      return {
        status: 'PAID',
        amountPaid: payAmount.toFixed(2),
        remainingBalance: newLoanBal.toFixed(2),
      };
    });
  }
}
