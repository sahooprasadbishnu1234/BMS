import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferDto {
  @ApiProperty({ example: '1001009821' })
  @IsString()
  @IsNotEmpty()
  sourceAccountNumber: string;

  @ApiProperty({ example: '1002005411' })
  @IsString()
  @IsNotEmpty()
  destinationAccountNumber: string;

  @ApiProperty({ example: 250.0 })
  @IsNumber()
  @Min(0.5)
  amount: number;

  @ApiProperty({ example: 'Dinner expense reimbursement', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
