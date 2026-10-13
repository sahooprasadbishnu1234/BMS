import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @ApiProperty({ example: 'Transaction discrepancy on savings account' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: 'TRANSACTION_DISPUTE' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ enum: TicketPriority, example: TicketPriority.MEDIUM, required: false })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiProperty({ example: 'I noticed a charge that I did not recognize on yesterday statement.' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
