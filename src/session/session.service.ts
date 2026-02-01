import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis'
import { StoreDto } from './dto/create-session.dto';

@Injectable()
export class SessionService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.redisClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'),
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          return null; // Stop retrying
        }
        return Math.min(times * 50, 2000);
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    this.redisClient.on('connect', () => {
      console.log('Connected to Redis');
    });

    this.redisClient.on('error', (err) => {
      // Suppress ECONNRESET errors during cleanup
      if ((err as any).code !== 'ECONNRESET') {
        console.error('Redis connection error:', err);
      }
    });

    try {
      await this.redisClient.connect();
    } catch (err) {
      console.error('Failed to connect to Redis:', err);
    }
  }

  async onModuleDestroy() {
    try {
      if (this.redisClient && this.redisClient.status !== 'end') {
        await this.redisClient.quit();
      }
    } catch (err) {
      // Ignore errors during cleanup
      console.error('Error closing Redis connection:', err);
    }
  }

  async storeTokenWhitelist(storeDto: StoreDto) {
    const { tokenId, userId, expiresIn } = storeDto;
    await this.redisClient.set(`whitelist:${tokenId}`, userId, 'EX', expiresIn, 'NX');
  }

  async isTokenWhitelisted(tokenId: string): Promise<boolean> {
    const userId = await this.redisClient.get(`whitelist:${tokenId}`);
    return userId !== null;
  }

  async removeTokenWhitelist(tokenId: string): Promise<void> {
    await this.redisClient.del(`whitelist:${tokenId}`);
  }

  async storeRefreshToken(storeDto: StoreDto) {
    const { tokenId, userId, expiresIn } = storeDto;
    await this.redisClient.set(`refresh:${tokenId}`, userId, 'EX', expiresIn, 'NX');
  }

  async getRefreshToken(tokenId: string): Promise<string | null> {
    return this.redisClient.get(`refresh:${tokenId}`);
  }

  async removeRefreshToken(tokenId: string): Promise<void> {
    await this.redisClient.del(`refresh:${tokenId}`);
  }
}