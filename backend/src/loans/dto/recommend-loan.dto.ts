import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecommendLoanDto {
  @ApiProperty({ example: 750 })
  @IsInt()
  @Min(300)
  @Max(850)
  creditScore: number;

  @ApiProperty({ example: 'Verified applicant payslips and credit history. DTI is 24%. Recommend approval.' })
  @IsString()
  @IsNotEmpty()
  recommendationNotes: string;
}
