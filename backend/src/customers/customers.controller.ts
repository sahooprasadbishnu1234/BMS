import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { KycStatus, UserStatus } from '@prisma/client';

@ApiTags('Customer Relationship Management (CRM)')
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles(
    'BANK_MANAGER',
    'BRANCH_MANAGER',
    'CUSTOMER_SERVICE_OFFICER',
    'SYSTEM_ADMINISTRATOR',
    'AUDITOR',
    'BANK_TELLER',
    'LOAN_OFFICER',
  )
  @ApiOperation({ summary: 'List all customer profiles with search, filter, and pagination' })
  async findAll(
    @Query('search') search?: string,
    @Query('kycStatus') kycStatus?: KycStatus,
    @Query('status') status?: UserStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.customersService.findAll({ search, kycStatus, status, page, limit });
  }

  @Get(':id')
  @Roles(
    'BANK_MANAGER',
    'BRANCH_MANAGER',
    'CUSTOMER_SERVICE_OFFICER',
    'SYSTEM_ADMINISTRATOR',
    'AUDITOR',
    'BANK_TELLER',
    'LOAN_OFFICER',
    'CUSTOMER',
  )
  @ApiOperation({ summary: 'Get complete customer profile and account portfolio' })
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  @Roles('BANK_MANAGER', 'BRANCH_MANAGER', 'CUSTOMER_SERVICE_OFFICER', 'SYSTEM_ADMINISTRATOR')
  @ApiOperation({ summary: 'Onboard and register a new retail banking customer' })
  @ApiResponse({ status: 201, description: 'Customer onboarded successfully' })
  async create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.customersService.create(dto, actor);
  }

  @Patch(':id')
  @Roles('BANK_MANAGER', 'BRANCH_MANAGER', 'CUSTOMER_SERVICE_OFFICER', 'SYSTEM_ADMINISTRATOR')
  @ApiOperation({ summary: 'Update customer personal profile or KYC verification state' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.customersService.update(id, dto, actor);
  }

  @Patch(':id/deactivate')
  @Roles('BANK_MANAGER', 'BRANCH_MANAGER', 'CUSTOMER_SERVICE_OFFICER', 'SYSTEM_ADMINISTRATOR')
  @ApiOperation({ summary: 'Soft-deactivate/suspend customer profile and freeze accounts' })
  async deactivate(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.customersService.deactivate(id, reason || 'Administrative suspension', actor);
  }

  @Delete(':id')
  @Roles('BANK_MANAGER', 'SYSTEM_ADMINISTRATOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purge customer record if no financial activity exists' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.customersService.delete(id, actor);
  }
}
