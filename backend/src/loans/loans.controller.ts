import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { ApplyLoanDto } from './dto/apply-loan.dto';
import { RecommendLoanDto } from './dto/recommend-loan.dto';
import { RepayLoanDto } from './dto/repay-loan.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Loans & Credit Facilities')
@Controller('loans')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get('products')
  @ApiOperation({ summary: 'Get active loan products with interest rates & terms' })
  async getProducts() {
    return this.loansService.getProducts();
  }

  @Get('applications')
  @ApiOperation({ summary: 'List loan applications (scoped to customer, officer, or manager)' })
  async getApplications(@CurrentUser() user: AuthenticatedUser) {
    return this.loansService.getApplications(user);
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get detailed loan application with documents and schedule' })
  async getApplicationById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.loansService.getApplicationById(id, user);
  }

  @Post('applications')
  @ApiOperation({ summary: 'Customer submits a new credit application' })
  async apply(@Body() dto: ApplyLoanDto, @CurrentUser() user: AuthenticatedUser) {
    return this.loansService.apply(dto, user);
  }

  @Post('applications/:id/recommend')
  @Roles('LOAN_OFFICER')
  @ApiOperation({ summary: 'Loan officer records eligibility assessment and recommendation' })
  async recommend(
    @Param('id') id: string,
    @Body() dto: RecommendLoanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.loansService.recommend(id, dto, user);
  }

  @Post('applications/:id/approve')
  @Roles('BANK_MANAGER', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Branch or Bank Manager grants final loan approval' })
  async approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.loansService.approve(id, user);
  }

  @Post('applications/:id/disburse')
  @Roles('BANK_MANAGER', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Disburse approved loan to customer account and generate schedule' })
  async disburse(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.loansService.disburse(id, user);
  }

  @Post('accounts/:id/repay')
  @ApiOperation({ summary: 'Make loan installment repayment' })
  async repay(
    @Param('id') id: string,
    @Body() dto: RepayLoanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.loansService.repay(id, dto, user);
  }
}
