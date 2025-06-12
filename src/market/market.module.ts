import { Module } from '@nestjs/common';
import { MarketController, MarketTypesController } from './market.controller';
import { MarketService } from './market.service';
import { MarketTypesService } from './market-types.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, BlockchainModule, NotificationsModule],
  controllers: [MarketController, MarketTypesController],
  providers: [MarketService, MarketTypesService],
})
export class MarketModule {}
