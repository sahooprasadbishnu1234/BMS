import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ComplianceStatus } from '@prisma/client';

export class UpdateComplianceCaseDto {
  @ApiProperty({ enum: ComplianceStatus })
  @IsEnum(ComplianceStatus)
  status: ComplianceStatus;

  @ApiProperty({ example: 'Customer provided matching commercial invoice. Risk cleared.' })
  @IsString()
  @IsNotEmpty()
  findings: string;

  @ApiProperty({ example: 'Updated AML risk score to low', required: false })
  @IsOptional()
  @IsString()
  actionsTaken?: string;
}
