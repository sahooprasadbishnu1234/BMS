import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LedgerService } from './ledger.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('General Ledger & Accounting')
@Controller('ledger')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('chart-of-accounts')
  @Roles('ACCOUNTANT', 'BANK_MANAGER', 'AUDITOR')
  @ApiOperation({ summary: 'Get the complete Chart of Accounts (COA)' })
  async getChartOfAccounts() {
    return this.ledgerService.getChartOfAccounts();
  }

  @Get('journal-entries')
  @Roles('ACCOUNTANT', 'BANK_MANAGER', 'AUDITOR')
  @ApiOperation({ summary: 'Get posted immutable journal entries' })
  async getJournalEntries() {
    return this.ledgerService.getJournalEntries();
  }

  @Post('journal-entries')
  @Roles('ACCOUNTANT')
  @ApiOperation({ summary: 'Post balanced double-entry manual journal entry' })
  async postJournalEntry(
    @Body() dto: CreateJournalEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ledgerService.postJournalEntry(dto, user);
  }

  @Get('trial-balance')
  @Roles('ACCOUNTANT', 'BANK_MANAGER', 'AUDITOR')
  @ApiOperation({ summary: 'Generate balanced Trial Balance report' })
  async getTrialBalance() {
    return this.ledgerService.getTrialBalance();
  }

  @Get('balance-sheet')
  @Roles('ACCOUNTANT', 'BANK_MANAGER', 'AUDITOR')
  @ApiOperation({ summary: 'Generate formal Balance Sheet statement' })
  async getBalanceSheet() {
    return this.ledgerService.getBalanceSheet();
  }
}
