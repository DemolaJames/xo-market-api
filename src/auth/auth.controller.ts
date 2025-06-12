import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login-dto';


@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with wallet address' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() { walletAddress }: LoginDto) {
    return this.authService.login(walletAddress);
  }
}
