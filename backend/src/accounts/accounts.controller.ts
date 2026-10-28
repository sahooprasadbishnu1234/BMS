import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AccountStatus } from '@prisma/client';

@ApiTags('Accounts')
@Controller('accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List bank accounts (filtered by role ownership or branch)' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('status') status?: AccountStatus,
  ) {
    return this.accountsService.findAll(user, { search, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bank account details by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.accountsService.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Open a new bank account' })
  async create(
    @Body() createDto: CreateAccountDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.accountsService.create(createDto, user);
  }

  @Patch(':id/status')
  @Roles('BANK_MANAGER', 'BRANCH_MANAGER', 'COMPLIANCE_OFFICER')
  @ApiOperation({ summary: 'Update account status (Freeze, Unfreeze, Close)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateAccountStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.accountsService.updateStatus(id, updateDto, user);
  }

  @Get(':id/statement')
  @ApiOperation({ summary: 'Generate detailed bank account statement' })
  async getStatement(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.accountsService.getStatement(id, user, startDate, endDate);
  }
}
