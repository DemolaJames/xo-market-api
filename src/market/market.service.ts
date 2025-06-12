import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketTypesService } from './market-types.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  constructor(
    private prisma: PrismaService,
    private marketTypes: MarketTypesService,
    private blockchain: BlockchainService,
    private notifications: NotificationsService,
  ) {}

  async create(userId: number, marketData: any) {

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }, // only fetch id for existence check
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} does not exist`);
    }

 
    // Create market
    const market = await this.prisma.market.create({
      data: {
        title: marketData.title,
        description: marketData.description,
        expiry: new Date(marketData.expiry),
        convictionLevel: marketData.convictionLevel,
        creatorId: userId,
        ...(marketData.marketTypeId && { marketTypeId: marketData.marketTypeId }) 
      },
      include: {
        creator: {
          select: { walletAddress: true, convictionPoints: true },
        },
        marketType: {
          select: { id: true, name: true },
        },
      },
    });

    // Send real-time notification
    this.notifications.notifyMarketCreated(market);

    this.logger.log(`✅ Market ${market.id} created`);
    return market;
  }

  async approve(marketId: number, marketTypeId: number, approverId: number) {
    const market = await this.prisma.market.findUnique({
      where: { id: marketId },
      include: { marketType: true, creator: true },
    });

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    if (market.status !== 'PENDING') {
      throw new BadRequestException('Market is not pending');
    }

    // Validate market
    await this.marketTypes.validateMarket(marketTypeId, market);

    // Approve and award points
    const [updatedMarket] = await this.prisma.$transaction([
      this.prisma.market.update({
        where: { id: marketId },
        data: {
          status: 'APPROVED',
          marketTypeId: marketTypeId,
          approvedById: approverId,
          approvedAt: new Date(),
        },
        include: {
          creator: { select: { walletAddress: true, convictionPoints: true } },
          approvedBy: { select: { walletAddress: true } },
          marketType: { select: { id: true, name: true } },
        },
      }),
      this.prisma.user.update({
        where: { id: market.creatorId },
        data: { convictionPoints: { increment: 1 } },
      }),
    ]);

    // Send approval notification
    this.notifications.notifyMarketApproved(updatedMarket);

    // Deploy to blockchain asynchronously
    this.deployToBlockchain(marketId);

    this.logger.log(`✅ Market ${marketId} approved`);
    return updatedMarket;
  }

  private async deployToBlockchain(marketId: number) {
    try {
      const market = await this.prisma.market.findUnique({
        where: { id: marketId },
        include: { creator: true },
      });

      if (!market) return;

      const { txHash } = await this.blockchain.deployMarket(marketId);
      this.notifications.notifyMarketDeployed(market, txHash);
    } catch (error) {
      this.logger.error(`❌ Deployment failed: ${error}`);

      const market = await this.prisma.market.findUnique({
        where: { id: marketId },
        include: { creator: true },
      });

      if (market) {
        this.notifications.notifyMarketFailed(market, 'Error occured while deploying market');
      }
    }
  }

  async findAll(filters: any = {}) {
    const { status, marketTypeId, limit = 50, offset = 0 } = filters;

    const where: any = {};
    if (status) where.status = status;
    if (marketTypeId) where.marketTypeId = parseInt(marketTypeId);

    return this.prisma.market.findMany({
      where,
      include: {
        creator: { select: { walletAddress: true, convictionPoints: true } },
        approvedBy: { select: { walletAddress: true } },
        marketType: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async findById(id: number) {
    const market = await this.prisma.market.findUnique({
      where: { id },
      include: {
        creator: { select: { walletAddress: true, convictionPoints: true } },
        approvedBy: { select: { walletAddress: true } },
        marketType: { select: { id: true, name: true, description: true } },
      },
    });

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    return market;
  }

  async getMyMarkets(userId: number) {
    return this.prisma.market.findMany({
      where: { creatorId: userId },
      include: {
        marketType: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
