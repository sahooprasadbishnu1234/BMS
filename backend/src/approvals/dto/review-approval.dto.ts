import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewApprovalDto {
  @ApiProperty({ example: 'Verified client authorization and collateral.' })
  @IsString()
  @IsNotEmpty()
  reviewNotes: string;
}
