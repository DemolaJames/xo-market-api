import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MarketTypesService } from '../src/market/market-types.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('MarketTypesService', () => {
  let service: MarketTypesService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketTypesService,
        {
          provide: PrismaService,
          useValue: {
            marketType: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MarketTypesService>(MarketTypesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('validateMarket', () => {
    it('should approve Low Risk market with 25+ hours expiry', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 25);

      const mockMarketType = {
        id: 1,
        name: 'Low Risk',
        validationRules: { minExpiryHours: 24 },
        createdAt: new Date(),
        description: '',
        isActive: true,
      };

      jest.spyOn(prismaService.marketType, 'findUnique').mockResolvedValue(mockMarketType);

      const result = await service.validateMarket(1, {
        title: 'Test Market',
        description: 'Test Description',
        expiry: futureDate,
        convictionLevel: 0.5,
      });

      expect(result).toBe(true);
    });

    it('should reject Low Risk market with <24 hours expiry', async () => {
      const nearDate = new Date();
      nearDate.setHours(nearDate.getHours() + 23);

      const mockMarketType = {
        id: 1,
        name: 'Low Risk',
        validationRules: { minExpiryHours: 24 },
        createdAt: new Date(),
        description: '',
        isActive: true,
      };

      jest.spyOn(prismaService.marketType, 'findUnique').mockResolvedValue(mockMarketType);

      await expect(
        service.validateMarket(1, {
          title: 'Test Market',
          description: 'Test Description',
          expiry: nearDate,
          convictionLevel: 0.5,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject Meme market with banned words', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 2);

      const mockMarketType = {
        id: 3,
        name: 'Meme',
        validationRules: { bannedWords: ['rug', 'scam', 'ponzi', 'exit'] },
        createdAt: new Date(),
        description: '',
        isActive: true,
      };

      jest.spyOn(prismaService.marketType, 'findUnique').mockResolvedValue(mockMarketType);

      await expect(
        service.validateMarket(3, {
          title: 'This is a rug pull market',
          description: 'Testing banned words',
          expiry: futureDate,
          convictionLevel: 0.3,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
