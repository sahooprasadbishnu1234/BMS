import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OpenSessionDto {
  @ApiProperty({ example: 10000.0 })
  @IsNumber()
  @Min(0)
  openingCash: number;

  @ApiProperty({ example: 'Morning vault count verified', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseSessionDto {
  @ApiProperty({ example: 14500.0 })
  @IsNumber()
  @Min(0)
  declaredCash: number;

  @ApiProperty({ example: 'End of day physical count', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
