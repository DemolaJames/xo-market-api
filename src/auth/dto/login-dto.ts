
import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
@ApiProperty({ example: '0x43545' })
  @IsString()
  @IsNotEmpty()
  walletAddress!: string;
}