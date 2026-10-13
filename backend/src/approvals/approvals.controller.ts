import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApprovalsService } from './approvals.service';
import { ReviewApprovalDto } from './dto/review-approval.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Maker-Checker Dual Control Approvals')
@Controller('approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get('pending')
  @Roles('BANK_MANAGER', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'List pending approval tickets in Maker-Checker queue' })
  async findPending(@CurrentUser() user: AuthenticatedUser) {
    return this.approvalsService.findPending(user);
  }

  @Post(':id/approve')
  @Roles('BANK_MANAGER', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Checker grants approval and executes operation atomically' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ReviewApprovalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvalsService.approve(id, dto, user);
  }

  @Post(':id/reject')
  @Roles('BANK_MANAGER', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Checker rejects operation' })
  async reject(
    @Param('id') id: string,
    @Body() dto: ReviewApprovalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvalsService.reject(id, dto, user);
  }
}
