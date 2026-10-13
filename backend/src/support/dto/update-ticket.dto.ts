import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TicketPriority, TicketStatus } from '@prisma/client';

export class UpdateTicketDto {
  @ApiProperty({ enum: TicketStatus, required: false })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiProperty({ enum: TicketPriority, required: false })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiProperty({ example: 'EMP-CSO-001', required: false })
  @IsOptional()
  @IsString()
  assignedEmployeeId?: string;

  @ApiProperty({ example: 'Verified fraud logs and cleared customer.', required: false })
  @IsOptional()
  @IsString()
  internalNotes?: string;
}
