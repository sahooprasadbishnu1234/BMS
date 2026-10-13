import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { EntryType } from '@prisma/client';

export class JournalLineDto {
  @ApiProperty({ example: '1010' })
  @IsString()
  @IsNotEmpty()
  ledgerAccountCode: string;

  @ApiProperty({ enum: EntryType, example: EntryType.DEBIT })
  @IsEnum(EntryType)
  entryType: EntryType;

  @ApiProperty({ example: 1000.0 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'Cash adjustment for vault count', required: false })
  @IsOptional()
  @IsString()
  memo?: string;
}

export class CreateJournalEntryDto {
  @ApiProperty({ example: 'Adjustment entry for physical currency variance' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ type: [JournalLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines: JournalLineDto[];
}
