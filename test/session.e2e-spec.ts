import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/users/entities/user.entity';
import session from 'express-session';
import connectRedis from 'connect-redis';
import { InjectRedis } from '@nestjs-modules/ioredis';

describe('Session Authentication (e2e)', () => {
  let app: INestApplication;
  let userRepository: any;
  let agent: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.dev' }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    const configService = app.get(ConfigService);
    
    // Get the Redis client from the module
    const redisClient = moduleFixture.get('default_IORedisModuleConnectionToken');
    
    const RedisStore = connectRedis(session);

    // Session middleware for session-based auth
    app.use(
      session({
        store: new RedisStore({ client: redisClient }),
        secret: configService.get('SECRET')!,
        resave: false,
        saveUninitialized: false,
        cookie: {
          maxAge: 24 * 60 * 60 * 1000,
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
        },
      }),
    );

    userRepository = moduleFixture.get(getRepositoryToken(User));

    await app.init();
    agent = request.agent(app.getHttpServer());
    // Clean up before tests
    await userRepository.delete({ email: 'session.test@example.com' });
  });

  afterAll(async () => {
    await userRepository.delete({ email: 'session.test@example.com' });
    await app.close();
  });

  describe('Session Authentication Flow', () => {
    const testUser = {
      email: 'session.test@example.com',
      password: 'SecurePassword123',
      name: 'Session Test User',
    };

    it('should complete full session auth flow', async () => {
      // Register
      await agent
        .post('/auth/session/register')
        .send(testUser)
        .expect(201);

      // Login - session cookie set automatically
      const loginRes = await agent
        .post('/auth/session/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201);

      expect(loginRes.body).toHaveProperty('message', 'Login successful');
      expect(loginRes.headers['set-cookie']).toBeDefined();

      // Access protected route with session cookie
      await agent
        .get('/auth/session/profile')
        .expect(200)
        .expect((res) => {
          expect(res.body.strategy).toBe('session');
          expect(res.body.user.id).toBeDefined();
        });

      // Logout
      await agent
        .post('/auth/session/logout')
        .expect(200);

      // Try to access after logout - should fail
      await agent
        .get('/auth/session/profile')
        .expect(403);
    });

    it('should fail without session cookie', async () => {
      // Fresh request without cookie
      await request(app.getHttpServer())
        .get('/auth/session/profile')
        .expect(403);
    });
  });
});