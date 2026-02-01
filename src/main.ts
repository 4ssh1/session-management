import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import session from 'express-session';
import Redis from 'ioredis';
import connectRedis from 'connect-redis';

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
    port: parseInt(configService.get('REDIS_PORT') || '6379'),
    maxRetriesPerRequest: 10,
    retryStrategy(times) {
      // Exponential backoff up to 2 seconds
      return Math.min(times * 100, 2000);
    },
    reconnectOnError(err) {
      // Reconnect on connection reset/aborted
      const targetErrors = ['ECONNRESET', 'ECONNABORTED'];
      if (targetErrors.some(code => err.message.includes(code))) {
        return true;
      }
      return false;
    },
  });

  redisClient.on('connect', () => {
    console.log('Redis connected for session store');
  });

  const RedisStore = connectRedis(session);

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

  const port = parseInt(configService.get('PORT') || '3000');
  await app.listen(port);
}
bootstrap();
