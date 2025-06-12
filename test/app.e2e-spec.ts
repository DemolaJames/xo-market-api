import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('XO Market API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let adminToken: string;
  let userId: number;
  let adminUserId: number;
  let marketTypeId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // Create test users
    const userResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ walletAddress: '0xUser123' })
      .expect(201);
    userToken = userResponse.body.access_token;
    userId = userResponse.body.id

    await prisma.user.create({
      data: { walletAddress: '0xAdmin123', isAdmin: true },
    });

    const adminResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ walletAddress: '0xAdmin123' })
      .expect(201);
    adminToken = adminResponse.body.access_token;
    adminUserId = adminResponse.body.id;
  });

  afterAll(async () => {
    await prisma.market.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
    
  });

  describe('/market-types (GET)', () => {
    it('should return market types', async () => {
      const response = await request(app.getHttpServer()).get('/market-types').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
    });
  });

  describe('/markets (POST)', () => {
    it('should create Low Risk market', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 48);

      const dto = {
        title: 'Will it rain tomorrow?',
        description: 'Simple weather prediction market.',
        expiry: futureDate.toISOString(),
        convictionLevel: 0.6
      };

      const response = await request(app.getHttpServer())
        .post('/markets')
        .set('Authorization', `Bearer ${userToken}`)
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        title: dto.title,
        status: 'PENDING',
      });
    });

    it('should reject invalid market', async () => {
      const nearDate = new Date();
      nearDate.setHours(nearDate.getHours() + 23);

      const dto = {
        title: '', // no title
        description: 'Should fail.',
        expiry: nearDate.toISOString(),
        convictionLevel: 0.5 
      };

      await request(app.getHttpServer())
        .post('/markets')
        .set('Authorization', `Bearer ${userToken}`)
        .send(dto)
        .expect(400);
    });
  });

  describe('/markets/approve (POST)', () => {
    let marketId: number;

    beforeEach(async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 48);

      const response = await request(app.getHttpServer()).get('/market-types').expect(200);
      marketTypeId = response.body[0].id

      // const market = await prisma.market.create({
      //   data: {
      //     title: 'Test Market',
      //     description: 'For approval test',
      //     expiry: futureDate,
      //     convictionLevel: 0.6,
      //     creatorId: userId,
      //     status: 'PENDING',
      //   },
      // });

      const dto = {
        title: 'Test Market',
        description: 'For approval test',
        expiry: futureDate,
        convictionLevel: 0.6,
      };

      const marketResponse = await request(app.getHttpServer())
      .post('/markets')
      .set('Authorization', `Bearer ${userToken}`)
      .send(dto)

      marketId = marketResponse.body.id;
   
    });


    it('should reject non-admin approval', async () => {
      await request(app.getHttpServer())
        .post('/markets/approve')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ marketId, marketTypeId })
        .expect(400);
    });
  });


});
