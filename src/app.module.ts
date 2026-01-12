import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './db/db.module';
import { RedisConfigModule } from './redis/redis.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true}),
    DatabaseModule,
    RedisConfigModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
