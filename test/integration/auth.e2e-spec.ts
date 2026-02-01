import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';
import { SessionService } from '../../src/session/session.service';
import { User } from '../../src/users/entities/user.entity';

describe('Auth Integration Tests', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let sessionService: SessionService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true, // makes ConfigService available everywhere
          envFilePath: '.env.dev',
        }),

        TypeOrmModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            type: 'postgres',
            host: config.get<string>('DB_HOST', 'localhost'),
            port: config.get<number>('DB_PORT', 5432),
            username: config.get<string>('DB_USER', 'postgres'),
            password: config.get<string>('DB_PASSWORD', 'postgres'),
            database: config.get<string>(
              'DB_NAME',
              'session_management_test',
            ),
            entities: [User],
            synchronize: true,
            dropSchema: true, // clean DB for each test run
          }),
        }),

        TypeOrmModule.forFeature([User]),

        JwtModule.registerAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            secret: config.get<string>('JWT_SECRET', 'test-secret'),
            signOptions: {
              expiresIn: config.get<number>('JWT_EXPIRES_IN', 900), // 15 minutes
            },
          }),
        }),
      ],
      providers: [AuthService, UsersService, SessionService],
    }).compile();

    authService = module.get(AuthService);
    usersService = module.get(UsersService);
    sessionService = module.get(SessionService);

    await module.init();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Complete Authentication Workflow', () => {
    const testUser = {
      email: 'integration@example.com',
      password: 'IntegrationTest123',
      name: 'Integration Test',
    };

    it('should register, login, and validate user with real database', async () => {
      const registeredUser = await authService.register(testUser);

      expect(registeredUser).toHaveProperty('id');
      expect(registeredUser.email).toBe(testUser.email);

      const validatedUser = await authService.validateUser(
        testUser.email,
        testUser.password,
      );

      expect(validatedUser).toBeTruthy();
      expect(validatedUser.email).toBe(testUser.email);

      const jwtResult = await authService.jwtLogin(validatedUser);

      expect(jwtResult).toHaveProperty('access_token');
      expect(jwtResult.user).toBeTruthy();

      await usersService['usersRepository'].clear();
    });

    it('should handle hybrid auth with Redis whitelist', async () => {
      await authService.register({
        email: 'hybrid.int@example.com',
        password: 'Test123',
        name: 'Hybrid',
      });

      const user = await authService.validateUser(
        'hybrid.int@example.com',
        'Test123',
      );

      const hybridResult = await authService.hybridLogin(user);

      expect(hybridResult).toHaveProperty('access_token');

      await usersService['usersRepository'].clear();
    });
  });
});
