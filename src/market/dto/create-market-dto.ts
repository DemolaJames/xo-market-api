import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsString, Max, Min } from "class-validator";

export class CreateMarketDto {
  @ApiProperty({ example: 'Will Bitcoin reach $1,000,000 by end of 2027?' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Market resolves YES if BTC >= $100k by Dec 31, 2025' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: '2025-12-31T23:59:59.000Z' })
  @IsDateString()
  expiry: string;

  @ApiProperty({ example: 0.75, minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  convictionLevel: number;

}