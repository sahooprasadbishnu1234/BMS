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
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AddMessageDto } from './dto/add-message.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { TicketPriority, TicketStatus } from '@prisma/client';

@ApiTags('Customer Support & CRM')
@Controller('support')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'List support tickets (filtered by customer ownership or staff permissions)' })
  async getTickets(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: TicketStatus,
    @Query('priority') priority?: TicketPriority,
  ) {
    return this.supportService.getTickets(user, { status, priority });
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get support ticket thread with messages and metadata' })
  async getTicketById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.supportService.getTicketById(id, user);
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Customer creates a new support dispute ticket' })
  async createTicket(
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.supportService.createTicket(dto, user);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Post customer reply or staff message/internal note' })
  async addMessage(
    @Param('id') id: string,
    @Body() dto: AddMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.supportService.addMessage(id, dto, user);
  }

  @Patch('tickets/:id')
  @ApiOperation({ summary: 'Update ticket status, priority, or internal notes (Staff)' })
  async updateTicket(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.supportService.updateTicket(id, dto, user);
  }
}
