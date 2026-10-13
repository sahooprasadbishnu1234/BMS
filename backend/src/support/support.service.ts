import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AddMessageDto } from './dto/add-message.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketPriority, TicketStatus } from '@prisma/client';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async getTickets(
    user: AuthenticatedUser,
    query?: { status?: TicketStatus; priority?: TicketPriority },
  ) {
    const where: any = {};

    if (query?.status) where.status = query.status;
    if (query?.priority) where.priority = query.priority;

    if (user.roles.includes('CUSTOMER')) {
      if (!user.customerId) {
        throw new ForbiddenException('No customer profile associated.');
      }
      where.customerId = user.customerId;
    }

    return this.prisma.supportTicket.findMany({
      where,
      include: {
        customer: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        assignedEmployee: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTicketById(id: string, user: AuthenticatedUser) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        assignedEmployee: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket ${id} not found.`);
    }

    if (user.roles.includes('CUSTOMER') && ticket.customerId !== user.customerId) {
      throw new ForbiddenException('You cannot access other customer tickets.');
    }

    // Protection of internal notes: If viewer is customer, filter out internal notes
    if (user.roles.includes('CUSTOMER')) {
      ticket.messages = ticket.messages.filter((m) => !m.isInternal);
      ticket.internalNotes = null;
    }

    return ticket;
  }

  async createTicket(dto: CreateTicketDto, user: AuthenticatedUser) {
    if (!user.customerId) {
      throw new BadRequestException('Only customers can submit new support dispute tickets.');
    }

    const ticketNumber = `TKT-${Date.now()}`;

    return this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        customerId: user.customerId,
        subject: dto.subject,
        category: dto.category,
        priority: dto.priority || TicketPriority.MEDIUM,
        status: TicketStatus.OPEN,
        messages: {
          create: {
            senderId: user.userId,
            message: dto.message,
            isInternal: false,
          },
        },
      },
      include: { messages: true },
    });
  }

  async addMessage(id: string, dto: AddMessageDto, user: AuthenticatedUser) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found.`);
    }

    if (user.roles.includes('CUSTOMER')) {
      if (ticket.customerId !== user.customerId) {
        throw new ForbiddenException('You cannot message on other customers tickets.');
      }
      if (dto.isInternal) {
        throw new ForbiddenException('Customers cannot post internal staff notes.');
      }
    }

    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId: id,
        senderId: user.userId,
        message: dto.message,
        isInternal: dto.isInternal || false,
      },
      include: {
        sender: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    // If staff replies to customer, move from OPEN to IN_PROGRESS
    if (!user.roles.includes('CUSTOMER') && ticket.status === TicketStatus.OPEN) {
      await this.prisma.supportTicket.update({
        where: { id },
        data: { status: TicketStatus.IN_PROGRESS },
      });
    }

    return message;
  }

  async updateTicket(id: string, dto: UpdateTicketDto, user: AuthenticatedUser) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found.`);
    }

    const updateData: any = {};
    if (dto.status) {
      updateData.status = dto.status;
      if (dto.status === TicketStatus.RESOLVED || dto.status === TicketStatus.CLOSED) {
        updateData.resolvedAt = new Date();
      }
    }
    if (dto.priority) updateData.priority = dto.priority;
    if (dto.assignedEmployeeId) updateData.assignedEmployeeId = dto.assignedEmployeeId;
    if (dto.internalNotes) updateData.internalNotes = dto.internalNotes;

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: updateData,
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.userId,
        action: 'SUPPORT_TICKET_UPDATED',
        targetEntity: 'SupportTicket',
        targetEntityId: id,
        metadata: { updates: updateData },
      },
    });

    return updated;
  }
}
