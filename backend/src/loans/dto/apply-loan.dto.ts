import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyLoanDto {
  @ApiProperty({ example: 'PERS-01', required: false })
  @IsString()
  @IsOptional()
  loanProductCode?: string;

  @ApiProperty({ example: 'bf993ff9-a343-4898-ab8a-b20c4bf265d9', required: false })
  @IsString()
  @IsOptional()
  loanProductId?: string;

  @ApiProperty({ example: 10000.0 })
  @IsNumber()
  @Min(500)
  requestedAmount: number;

  @ApiProperty({ example: 24 })
  @IsInt()
  @Min(6)
  @Max(360)
  tenureMonths: number;

  @ApiProperty({ example: 'Debt consolidation and medical expense' })
  @IsString()
  @IsNotEmpty()
  purpose: string;

  @ApiProperty({ example: 7500.0 })
  @IsNumber()
  @Min(500)
  monthlyIncome: number;
}
