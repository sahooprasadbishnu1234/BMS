import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Analytics & Reporting')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get executive banking summary metrics and KPIs' })
  async getExecutiveSummary() {
    return this.reportsService.getExecutiveSummary();
  }

  @Get('branches')
  @ApiOperation({ summary: 'Get branch comparative operational and liquidity performance' })
  async getBranchPerformance() {
    return this.reportsService.getBranchPerformance();
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get transaction velocity and daily trend series for charts' })
  async getTrends() {
    return this.reportsService.getMonthlyTransactionTrends();
  }
}
