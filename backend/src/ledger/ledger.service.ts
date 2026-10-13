import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import Decimal from 'decimal.js';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async getChartOfAccounts() {
    return this.prisma.ledgerAccount.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async getJournalEntries(limit = 50) {
    return this.prisma.journalEntry.findMany({
      include: {
        journalLines: {
          include: {
            ledgerAccount: true,
          },
        },
      },
      orderBy: { postingDate: 'desc' },
      take: limit,
    });
  }

  async postJournalEntry(dto: CreateJournalEntryDto, user: AuthenticatedUser) {
    if (!dto.lines || dto.lines.length < 2) {
      throw new BadRequestException('A journal entry must contain at least two line items.');
    }

    let totalDebits = new Decimal(0);
    let totalCredits = new Decimal(0);

    for (const line of dto.lines) {
      const amt = new Decimal(line.amount);
      if (line.entryType === 'DEBIT') {
        totalDebits = totalDebits.plus(amt);
      } else {
        totalCredits = totalCredits.plus(amt);
      }
    }

    if (!totalDebits.equals(totalCredits)) {
      throw new BadRequestException(
        `Double-entry imbalance: Total Debits (${totalDebits.toFixed(4)}) must exactly equal Total Credits (${totalCredits.toFixed(4)}).`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const entryNumber = `JE-MAN-${Date.now()}`;

      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          description: dto.description,
          isBalanced: true,
        },
      });

      for (const line of dto.lines) {
        const ledgerAccount = await tx.ledgerAccount.findUnique({
          where: { code: line.ledgerAccountCode },
        });

        if (!ledgerAccount) {
          throw new BadRequestException(`Ledger account code ${line.ledgerAccountCode} not found.`);
        }

        await tx.journalLine.create({
          data: {
            journalEntryId: journalEntry.id,
            ledgerAccountId: ledgerAccount.id,
            entryType: line.entryType,
            amount: new Decimal(line.amount).toFixed(4),
            memo: line.memo,
          },
        });

        // Update balance according to account type
        const amt = new Decimal(line.amount);
        let balance = new Decimal(ledgerAccount.currentBalance);

        if (
          ledgerAccount.accountType === 'ASSET' ||
          ledgerAccount.accountType === 'EXPENSE'
        ) {
          balance = line.entryType === 'DEBIT' ? balance.plus(amt) : balance.minus(amt);
        } else {
          balance = line.entryType === 'CREDIT' ? balance.plus(amt) : balance.minus(amt);
        }

        await tx.ledgerAccount.update({
          where: { id: ledgerAccount.id },
          data: { currentBalance: balance.toFixed(4) },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          action: 'MANUAL_JOURNAL_POSTED',
          targetEntity: 'JournalEntry',
          targetEntityId: journalEntry.id,
          metadata: { entryNumber, totalAmount: totalDebits.toFixed(4) },
        },
      });

      return tx.journalEntry.findUnique({
        where: { id: journalEntry.id },
        include: { journalLines: { include: { ledgerAccount: true } } },
      });
    });
  }

  async getTrialBalance() {
    const accounts = await this.prisma.ledgerAccount.findMany({
      include: {
        journalLines: true,
      },
      orderBy: { code: 'asc' },
    });

    let grandTotalDebits = new Decimal(0);
    let grandTotalCredits = new Decimal(0);

    const rows = accounts.map((acc) => {
      let debitSum = new Decimal(0);
      let creditSum = new Decimal(0);

      acc.journalLines.forEach((l) => {
        const amt = new Decimal(l.amount);
        if (l.entryType === 'DEBIT') debitSum = debitSum.plus(amt);
        else creditSum = creditSum.plus(amt);
      });

      grandTotalDebits = grandTotalDebits.plus(debitSum);
      grandTotalCredits = grandTotalCredits.plus(creditSum);

      return {
        code: acc.code,
        name: acc.name,
        accountType: acc.accountType,
        totalDebits: debitSum.toFixed(4),
        totalCredits: creditSum.toFixed(4),
        netBalance: acc.currentBalance,
      };
    });

    return {
      rows,
      grandTotalDebits: grandTotalDebits.toFixed(4),
      grandTotalCredits: grandTotalCredits.toFixed(4),
      isBalanced: grandTotalDebits.equals(grandTotalCredits),
    };
  }

  async getBalanceSheet() {
    const accounts = await this.prisma.ledgerAccount.findMany();

    const assets = accounts.filter((a) => a.accountType === 'ASSET');
    const liabilities = accounts.filter((a) => a.accountType === 'LIABILITY');
    const equity = accounts.filter((a) => a.accountType === 'EQUITY');

    const totalAssets = assets.reduce(
      (sum, a) => sum.plus(new Decimal(a.currentBalance)),
      new Decimal(0),
    );
    const totalLiabilities = liabilities.reduce(
      (sum, a) => sum.plus(new Decimal(a.currentBalance)),
      new Decimal(0),
    );
    const totalEquity = equity.reduce(
      (sum, a) => sum.plus(new Decimal(a.currentBalance)),
      new Decimal(0),
    );

    return {
      assets: assets.map((a) => ({ code: a.code, name: a.name, balance: a.currentBalance })),
      totalAssets: totalAssets.toFixed(4),
      liabilities: liabilities.map((a) => ({ code: a.code, name: a.name, balance: a.currentBalance })),
      totalLiabilities: totalLiabilities.toFixed(4),
      equity: equity.map((a) => ({ code: a.code, name: a.name, balance: a.currentBalance })),
      totalEquity: totalEquity.toFixed(4),
      totalLiabilitiesAndEquity: totalLiabilities.plus(totalEquity).toFixed(4),
      isBalanced: totalAssets.equals(totalLiabilities.plus(totalEquity)),
    };
  }
}
