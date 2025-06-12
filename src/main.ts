import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  // Basic Swagger setup
  const config = new DocumentBuilder()
    .setTitle('XO Market API')
    .setDescription('Decentralized Prediction Market API Engine')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // // Seed data on startup
  // try {
  //   const marketTypesService = app.get(MarketTypesService);
  //   await marketTypesService.seedMarketTypes();
  //   console.log('✅ Database seeded successfully');
  // } catch (error) {
  //   console.error('❌ Failed to seed database:', error);
  // }

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api`);
  console.log(`SSE stream: http://localhost:${port}/notifications/stream`);
}

bootstrap();
