import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { MarketService } from './market.service';
import { MarketTypesService } from './market-types.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Request as ExpressRequest } from 'express';
import { CreateMarketDto } from './dto/create-market-dto';
import { ApproveMarketDto } from './dto/approve-market-dto';
import { UserExistsGuard } from '../common/user-exists.guard';


@ApiTags('Markets')
@Controller('markets')
export class MarketController {
  constructor(
    private marketService: MarketService,
    private marketTypesService: MarketTypesService,
    private blockchainService: BlockchainService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new market' })
  @ApiResponse({ status: 201, description: 'Market created successfully' })
  async create(@Body() dto: CreateMarketDto, @Request() req: ExpressRequest) {
    return this.marketService.create((req.user as any).id, dto);
  }

  @Post('approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a market (Admin only)' })
  @ApiResponse({ status: 200, description: 'Market approved' })
  async approve(@Body() dto: ApproveMarketDto, @Request() req: ExpressRequest) {
    if (!req.user?.isAdmin) {
      throw new BadRequestException('Admin access required');
    }
    return this.marketService.approve(dto.marketId, dto.marketTypeId, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all markets' })
  @ApiResponse({ status: 200, description: 'List of markets' })
  async findAll(
    @Query('status') status?: string,
    @Query('marketTypeId') marketTypeId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters = { status, marketTypeId, limit, offset };
    return this.marketService.findAll(filters);
  }

  @Get('my-markets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user markets' })
  async getMyMarkets(@Request() req: ExpressRequest) {
    return this.marketService.getMyMarkets((req.user as Express.User).id);
  }

  @Get('blockchain/health')
  @ApiOperation({ summary: 'Check blockchain health' })
  @ApiResponse({ status: 200, description: 'Blockchain health status' })
  async getBlockchainHealth() {
    return this.blockchainService.getHealth();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get market by ID' })
  @ApiResponse({ status: 200, description: 'Market details' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.marketService.findById(id);
  }
}

@ApiTags('Market Types')
@Controller('market-types')
export class MarketTypesController {
  constructor(private marketTypesService: MarketTypesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all market types' })
  @ApiResponse({ status: 200, description: 'List of market types' })
  async findAll() {
    return this.marketTypesService.findAll();
  }
}
