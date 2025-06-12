import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';
import { MarketStatus } from '@prisma/client';

const MARKET_CONTRACT_ABI = [
  {
    inputs: [
      { internalType: 'string', name: 'title', type: 'string' },
      { internalType: 'string', name: 'description', type: 'string' },
      { internalType: 'uint256', name: 'expiry', type: 'uint256' },
      { internalType: 'uint256', name: 'conviction', type: 'uint256' },
    ],
    name: 'createMarket',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'marketId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'creator', type: 'address' },
      { indexed: false, internalType: 'string', name: 'title', type: 'string' },
      { indexed: false, internalType: 'uint256', name: 'expiry', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'conviction', type: 'uint256' },
    ],
    name: 'MarketCreated',
    type: 'event',
  },
];

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private provider!: ethers.Provider;
  private wallet!: ethers.Wallet;
  private contract!: ethers.Contract;

  constructor(private prisma: PrismaService) {
    this.initializeBlockchain();
  }

  private initializeBlockchain() {
    try {
      const rpcUrl = process.env.SEPOLIA_RPC || 'https://sepolia.infura.io/v3/demo';
      const privateKey = process.env.PRIVATE_KEY;
      const contractAddress =
        process.env.CONTRACT_ADDRESS || '0x52fa1d7ac079297abb4dc7b056d50cec4f255876';

      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      if (privateKey && privateKey !== 'your_private_key_here') {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.contract = new ethers.Contract(contractAddress, MARKET_CONTRACT_ABI, this.wallet);
        this.logger.log('✅ Blockchain initialized with real wallet');
      } else {
        this.logger.warn('⚠️ No private key - using mock mode');
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error('❌ Blockchain initialization failed:', error.message);
      } else {
        this.logger.error('❌ Blockchain initialization failed with unknown error:', error);
      }
    }
  }

  async deployMarket(marketId: number): Promise<{ txHash: string; onchainId: number }> {
    const market = await this.prisma.market.findUnique({
      where: { id: marketId },
      include: { creator: true },
    });

    if (!market) {
      throw new Error(`Market ${marketId} not found`);
    }

    if (!this.contract) {
      // Mock deployment
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      const mockOnchainId = Math.floor(Math.random() * 1000000);

      // Simulate deployment delay
      setTimeout(async () => {
        await this.prisma.market.update({
          where: { id: marketId },
          data: {
            status: MarketStatus.LIVE,
            txHash: mockTxHash,
            onchainId: mockOnchainId,
          },
        });
      }, 2000);

      this.logger.warn(`⚠️ Mock deployment for market ${marketId}`);
      return { txHash: mockTxHash, onchainId: mockOnchainId };
    }

    try {
      // Real blockchain deployment
      const convictionWei = ethers.parseEther(market.convictionLevel.toString());
      const expiryTimestamp = Math.floor(market.expiry.getTime() / 1000);

      this.logger.log(`🚀 Deploying market ${marketId} to blockchain`);

      const tx = await this.contract.createMarket(
        market.title,
        market.description,
        expiryTimestamp,
        convictionWei,
      );

      this.logger.log(`📝 Transaction: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      // Parse events for on-chain ID
      let onchainId = 0;
      for (const log of receipt.logs) {
        try {
          const parsed = this.contract.interface.parseLog(log);
          if (parsed?.name === 'MarketCreated') {
            onchainId = Number(parsed.args.marketId);
            break;
          }
        } catch (error) {
          // Skip unparseable logs
          // I will add a general logger
        }
      }

      // Update market
      await this.prisma.market.update({
        where: { id: marketId },
        data: {
          status: MarketStatus.LIVE,
          txHash: tx.hash,
          onchainId,
        },
      });

      this.logger.log(`✅ Market ${marketId} deployed successfully`);
      return { txHash: tx.hash, onchainId };
    } catch (error) {
      this.logger.error(`❌ Deployment failed for market ${marketId}:`, error);

      await this.prisma.market.update({
        where: { id: marketId },
        data: { status: MarketStatus.FAILED },
      });

      throw error;
    }
  }

  async getHealth() {
    try {
      if (!this.provider) {
        return { healthy: false, reason: 'No provider' };
      }

      const blockNumber = await this.provider.getBlockNumber();

      return {
        healthy: true,
        blockNumber,
        hasWallet: !!this.wallet,
        hasContract: !!this.contract,
        network: (await this.provider.getNetwork()).name,
      };
    } catch (error) {
      return { healthy: false, reason: error };
    }
  }
}
