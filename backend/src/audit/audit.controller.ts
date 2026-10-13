import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Audit & Compliance Forensics')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('AUDITOR', 'SYSTEM_ADMINISTRATOR', 'COMPLIANCE_OFFICER', 'BANK_MANAGER')
  @ApiOperation({ summary: 'Search and inspect append-only forensic audit trail' })
  async findAll(
    @Query('action') action?: string,
    @Query('targetEntity') targetEntity?: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.findAll({ action, targetEntity, limit });
  }
}
