import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { KycStatus, UserStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateCustomerDto {
  @ApiProperty({ example: 'Rohit', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Sharma', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: '+91 9876543210', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'NewPassword123!', required: false })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiProperty({ example: 'PAN1234567X', required: false })
  @IsOptional()
  @IsString()
  taxIdentifier?: string;

  @ApiProperty({ example: 'Chief Technology Officer', required: false })
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiProperty({ example: 120000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  monthlyIncome?: number;

  @ApiProperty({ enum: KycStatus, required: false })
  @IsOptional()
  @IsEnum(KycStatus)
  kycStatus?: KycStatus;

  @ApiProperty({ enum: UserStatus, required: false })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
