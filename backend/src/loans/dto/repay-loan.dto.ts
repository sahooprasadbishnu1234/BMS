import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RepayLoanDto {
  @ApiProperty({ example: '1001009821' })
  @IsString()
  @IsNotEmpty()
  sourceAccountNumber: string;

  @ApiProperty({ example: 545.48 })
  @IsNumber()
  @Min(1)
  amount: number;
}
