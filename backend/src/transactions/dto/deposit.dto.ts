import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DepositDto {
  @ApiProperty({ example: '1001009821' })
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @ApiProperty({ example: 500.0 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'Cash deposit via Downtown teller drawer', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
