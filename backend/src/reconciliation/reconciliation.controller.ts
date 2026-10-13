import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReconciliationService } from './reconciliation.service';
import { OpenSessionDto, CloseSessionDto } from './dto/session.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Teller Operations & Cash Reconciliation')
@Controller('reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Get('active-session')
  @Roles('BANK_TELLER', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Get current active open teller session and drawer balance' })
  async getActiveSession(@CurrentUser() user: AuthenticatedUser) {
    return this.reconciliationService.getActiveSession(user);
  }

  @Get('sessions')
  @Roles('BANK_TELLER', 'BRANCH_MANAGER', 'BANK_MANAGER', 'ACCOUNTANT', 'AUDITOR')
  @ApiOperation({ summary: 'List teller sessions and reconciliation summaries' })
  async getAllSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.reconciliationService.getAllSessions(user);
  }

  @Post('open-session')
  @Roles('BANK_TELLER', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Open cash drawer shift with verified opening balance' })
  async openSession(
    @Body() dto: OpenSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reconciliationService.openSession(dto, user);
  }

  @Post('sessions/:id/close')
  @Roles('BANK_TELLER', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Close cash drawer, record count, and calculate discrepancy' })
  async closeSession(
    @Param('id') id: string,
    @Body() dto: CloseSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reconciliationService.closeSession(id, dto, user);
  }

  @Post(':id/approve')
  @Roles('BRANCH_MANAGER', 'BANK_MANAGER')
  @ApiOperation({ summary: 'Branch manager approves cash reconciliation' })
  async approveReconciliation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reconciliationService.approveReconciliation(id, user);
  }
}
