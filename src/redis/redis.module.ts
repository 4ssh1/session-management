import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    RedisModule.forRootAsync({  
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
                host: configService.get<string>('REDIS_HOST'),
                port: configService.get<number>('REDIS_PORT'),
                type: 'single',}),
    }),
  ],
  exports: [RedisModule],
})
export class RedisConfigModule {}