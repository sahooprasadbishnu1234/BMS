import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus } from '@prisma/client';

export class UpdateAccountStatusDto {
  @ApiProperty({ enum: AccountStatus, example: AccountStatus.FROZEN })
  @IsEnum(AccountStatus)
  status: AccountStatus;

  @ApiProperty({ example: 'Suspicious overseas transaction reported by AML' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
