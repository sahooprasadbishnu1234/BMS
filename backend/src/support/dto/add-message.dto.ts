import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddMessageDto {
  @ApiProperty({ example: 'We have initiated a trace on this transaction reference.' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
