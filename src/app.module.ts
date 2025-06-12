import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MarketModule } from './market/market.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    PrismaModule,
    AuthModule,
    MarketModule,
    BlockchainModule,
    NotificationsModule,
  ],
})
export class AppModule {}
