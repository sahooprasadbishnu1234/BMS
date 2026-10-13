import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BranchesModule } from './branches/branches.module';
import { AccountsModule } from './accounts/accounts.module';
import { TransactionsModule } from './transactions/transactions.module';
import { LedgerModule } from './ledger/ledger.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { LoansModule } from './loans/loans.module';
import { SupportModule } from './support/support.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { AuditModule } from './audit/audit.module';
import { ComplianceModule } from './compliance/compliance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    BranchesModule,
    AccountsModule,
    TransactionsModule,
    LedgerModule,
    ApprovalsModule,
    LoansModule,
    SupportModule,
    ReconciliationModule,
    AuditModule,
    ComplianceModule,
    NotificationsModule,
    ReportsModule,
  ],
})
export class AppModule {}
