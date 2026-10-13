import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ComplianceService } from './compliance.service';
import { UpdateComplianceCaseDto } from './dto/update-case.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Anti-Money Laundering & Regulatory Compliance')
@Controller('compliance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('cases')
  @Roles('COMPLIANCE_OFFICER', 'AUDITOR', 'BANK_MANAGER')
  @ApiOperation({ summary: 'List AML alert and suspicious activity investigation cases' })
  async getCases() {
    return this.complianceService.getCases();
  }

  @Patch('cases/:id')
  @Roles('COMPLIANCE_OFFICER')
  @ApiOperation({ summary: 'Update findings, actions taken, or escalate SAR filing' })
  async updateCase(
    @Param('id') id: string,
    @Body() dto: UpdateComplianceCaseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.complianceService.updateCase(id, dto, user);
  }
}
