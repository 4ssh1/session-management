import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis'
import { StoreDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class SessionService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.redisClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'),
    });

    this.redisClient.on('connect', () => {
      console.log('Connected to Redis');
    });

    this.redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
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