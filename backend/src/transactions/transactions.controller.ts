import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawalDto } from './dto/withdrawal.dto';
import { TransferDto } from './dto/transfer.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { TransactionType } from '@prisma/client';

@ApiTags('Transactions')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('transactions')
  @ApiOperation({ summary: 'List transactions filtered by role, account, or type' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('type') type?: TransactionType,
    @Query('search') search?: string,
  ) {
    return this.transactionsService.findAll(user, { type, search });
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get detailed transaction receipt by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.transactionsService.findOne(id, user);
  }

  @Post('deposits')
  @Roles('BANK_TELLER', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Process teller cash deposit' })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  async deposit(
    @Body() dto: DepositDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.transactionsService.processDeposit(dto, user, idempotencyKey);
  }

  @Post('withdrawals')
  @Roles('BANK_TELLER', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Process teller cash withdrawal' })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  async withdrawal(
    @Body() dto: WithdrawalDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.transactionsService.processWithdrawal(dto, user, idempotencyKey);
  }

  @Post('transfers')
  @ApiOperation({ summary: 'Execute internal funds transfer' })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  async transfer(
    @Body() dto: TransferDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.transactionsService.processTransfer(dto, user, idempotencyKey);
  }
}
