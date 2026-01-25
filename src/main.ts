import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import Redis from 'ioredis';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable CORS for Postman testing
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Setup Redis client for sessions using ioredis
  const redisClient = new Redis({
    host: configService.get('REDIS_HOST'),
    port: configService.get('REDIS_PORT'),
  });

  redisClient.on('connect', () => {
    console.log('Redis connected for session store');
  });

  // Session middleware for session-based auth
  app.use(
    session({
      store: new RedisStore({ client: redisClient }),
      secret: configService.get('SECRET')!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 1 day in ms, or use configService.get('SESSION_MAXAGE') if set
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
        sameSite: 'lax',
      },
    }),
  );

  const port = configService.get('PORT');
  await app.listen(port);
}
bootstrap();
