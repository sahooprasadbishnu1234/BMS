import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { KycStatus, AccountType } from '@prisma/client';
import { Type } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({ example: 'new.customer@bms.bank' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+1 (555) 234-5678', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Salaried Professional', required: false })
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiProperty({ example: 50000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  monthlyIncome?: number;

  @ApiProperty({ enum: KycStatus, default: KycStatus.VERIFIED, required: false })
  @IsOptional()
  @IsEnum(KycStatus)
  kycStatus?: KycStatus;

  @ApiProperty({ example: 'SAVINGS', enum: AccountType, default: AccountType.SAVINGS, required: false })
  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  @ApiProperty({ example: 500, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  initialDeposit?: number;
}
