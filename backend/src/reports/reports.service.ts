import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Decimal from 'decimal.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getExecutiveSummary() {
    const totalAccounts = await this.prisma.bankAccount.count({
      where: { status: 'ACTIVE' },
    });

    const accounts = await this.prisma.bankAccount.findMany({
      select: { balance: true },
    });
    const totalDepositedLiquidity = accounts.reduce(
      (sum, a) => sum.plus(new Decimal(a.balance)),
      new Decimal(0),
    );

    const pendingApprovals = await this.prisma.approvalRequest.count({
      where: { status: 'PENDING' },
    });

    const activeLoans = await this.prisma.loanAccount.count({
      where: { status: 'ACTIVE' },
    });

    const openTickets = await this.prisma.supportTicket.count({
      where: { status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] } },
    });

    const openComplianceCases = await this.prisma.complianceCase.count({
      where: { status: { in: ['OPEN', 'INVESTIGATING'] } },
    });

    const txByType = await this.prisma.transaction.groupBy({
      by: ['transactionType'],
      _sum: { amount: true },
      _count: { id: true },
    });

    return {
      totalAccounts,
      totalDepositedLiquidity: totalDepositedLiquidity.toFixed(2),
      pendingApprovals,
      activeLoans,
      openTickets,
      openComplianceCases,
      transactionVolumeByType: txByType.map((t) => ({
        type: t.transactionType,
        count: t._count.id,
        totalAmount: (t._sum.amount || 0).toString(),
      })),
    };
  }

  async getBranchPerformance() {
    const branches = await this.prisma.branch.findMany({
      include: {
        _count: {
          select: {
            bankAccounts: true,
            employees: true,
            loanApplications: true,
          },
        },
        bankAccounts: {
          select: { balance: true },
        },
      },
    });

    return branches.map((b) => {
      const branchLiquidity = b.bankAccounts.reduce(
        (sum, a) => sum.plus(new Decimal(a.balance)),
        new Decimal(0),
      );
      return {
        id: b.id,
        code: b.code,
        name: b.name,
        city: b.city,
        accountsCount: b._count.bankAccounts,
        employeesCount: b._count.employees,
        loanApplicationsCount: b._count.loanApplications,
        totalLiquidity: branchLiquidity.toFixed(2),
      };
    });
  }

  async getMonthlyTransactionTrends() {
    const txs = await this.prisma.transaction.findMany({
      select: {
        transactionType: true,
        amount: true,
        executedAt: true,
      },
      orderBy: { executedAt: 'asc' },
      take: 200,
    });

    const groups: Record<string, { date: string; deposits: number; withdrawals: number; transfers: number }> = {};

    txs.forEach((tx) => {
      const d = tx.executedAt.toISOString().slice(0, 10);
      if (!groups[d]) {
        groups[d] = { date: d, deposits: 0, withdrawals: 0, transfers: 0 };
      }
      const val = parseFloat(tx.amount.toString());
      if (tx.transactionType === 'DEPOSIT') groups[d].deposits += val;
      else if (tx.transactionType === 'WITHDRAWAL') groups[d].withdrawals += val;
      else if (tx.transactionType === 'TRANSFER') groups[d].transfers += val;
    });

    return Object.values(groups);
  }
}
