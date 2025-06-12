import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ValidationRules {
  minExpiryHours?: number;
  minConvictionLevel?: number;
  maxConvictionLevel?: number;
  bannedWords?: string[];
}

@Injectable()
export class MarketTypesService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedMarketTypes();
  }

  async findAll() {
    return this.prisma.marketType.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        validationRules: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async validateMarket(marketTypeId: number, marketData: any) {
    const marketType = await this.prisma.marketType.findUnique({
      where: { id: marketTypeId },
    });
 
    if (!marketType) {
      throw new BadRequestException(`Market type ${marketTypeId} not found`);
    }

    const rules = marketType.validationRules as ValidationRules;
    const errors: string[] = [];

    // Validate conviction level
    if (rules.minConvictionLevel && marketData.convictionLevel < rules.minConvictionLevel) {
      errors.push(`${marketType.name} requires conviction >= ${rules.minConvictionLevel}`);
    }

    if (rules.maxConvictionLevel && marketData.convictionLevel > rules.maxConvictionLevel) {
      errors.push(`${marketType.name} requires conviction <= ${rules.maxConvictionLevel}`);
    }

    // Validate expiry
    const now = new Date();
    const hoursUntilExpiry = (marketData.expiry.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (rules.minExpiryHours && hoursUntilExpiry < rules.minExpiryHours) {
      errors.push(`${marketType.name} requires expiry >= ${rules.minExpiryHours} hours from now`);
    }

    // Validate banned words
    if (rules.bannedWords?.length) {
      const text = `${marketData.title} ${marketData.description}`.toLowerCase();
      const foundBanned = rules.bannedWords.filter((word) => text.includes(word.toLowerCase()));

      if (foundBanned.length > 0) {
        errors.push(`${marketType.name} cannot contain: ${foundBanned.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }

    return true;
  }

  private async seedMarketTypes() {
    const types = [
      {
        name: 'Low Risk',
        description: 'Markets with minimal risk - require expiry > 24 hours',
        validationRules: {
          minExpiryHours: 24,
          minConvictionLevel: 0.1,
          maxConvictionLevel: 1.0,
        },
      },
      {
        name: 'High Risk',
        description: 'High risk markets - require conviction > 0.7 and expiry > 48 hours',
        validationRules: {
          minConvictionLevel: 0.7,
          maxConvictionLevel: 1.0,
          minExpiryHours: 48,
        },
      },
      {
        name: 'Meme',
        description: 'Meme markets - cannot contain banned words',
        validationRules: {
          minExpiryHours: 1,
          minConvictionLevel: 0.01,
          maxConvictionLevel: 1.0,
          bannedWords: ['rug', 'scam', 'ponzi', 'exit'],
        },
      },
    ];

    for (const type of types) {
      await this.prisma.marketType.upsert({
        where: { name: type.name },
        update: {},
        create: type,
      });
    }
  }
}
