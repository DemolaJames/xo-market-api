import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(walletAddress: string) {
    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: { walletAddress },
      });
    }

    // Generate JWT
    const payload = { sub: user.id, isAdmin: user.isAdmin };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        isAdmin: user.isAdmin,
        convictionPoints: user.convictionPoints,
      },
    };
  }
}
