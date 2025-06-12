import { ApiProperty } from "@nestjs/swagger";
import { IsInt } from "class-validator";

export class ApproveMarketDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  marketId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  marketTypeId: number;
}