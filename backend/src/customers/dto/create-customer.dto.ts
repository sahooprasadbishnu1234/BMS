import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  MinLength,
  IsNumber,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { KycStatus, AccountType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateCustomerDto {
  @ApiProperty({ example: 'rohit.sharma@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Rohit' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Sharma' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+91 9876543210', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Password123!', required: false })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiProperty({ example: 'PAN1234567X', required: false })
  @IsOptional()
  @IsString()
  taxIdentifier?: string;

  @ApiProperty({ example: 'Senior Software Engineer', required: false })
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiProperty({ example: 85000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  monthlyIncome?: number;

  @ApiProperty({ enum: KycStatus, default: KycStatus.PENDING, required: false })
  @IsOptional()
  @IsEnum(KycStatus)
  kycStatus?: KycStatus;

  @ApiProperty({ example: 'SAVINGS', enum: AccountType, required: false })
  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  @ApiProperty({ example: 5000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  initialDeposit?: number;

  @ApiProperty({ example: 'uuid-branch-id', required: false })
  @IsOptional()
  @IsString()
  branchId?: string;
}
