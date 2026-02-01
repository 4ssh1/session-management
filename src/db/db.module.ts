import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: "postgres",
                host: configService.get<string>("DB_HOST"),
                port: parseInt(configService.get<string>("DB_PORT") || "5432"),
                username: configService.get<string>("DB_USER"),
                password: configService.get<string>("DB_PASSWORD")!,
                database: configService.get<string>("DB_NAME"),
                autoLoadEntities: true,
                synchronize: true,
                retryAttempts: 3,
                retryDelay: 3000,
                extra: {
                    connectionTimeoutMillis: 30000,
                    idleTimeoutMillis: 60000,
                    query_timeout: 30000,
                },
            }),
        }),
    ],
})

export class DatabaseModule {}