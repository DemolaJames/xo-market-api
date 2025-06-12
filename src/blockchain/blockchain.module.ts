import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {}
