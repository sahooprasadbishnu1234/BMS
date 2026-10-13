import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WithdrawalDto {
  @ApiProperty({ example: '1001009821' })
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @ApiProperty({ example: 200.0 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'Over-the-counter Cash Withdrawal', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
