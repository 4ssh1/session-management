import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigModule } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/users/entities/user.entity';

describe('Hybrid Authentication (e2e)', () => {
  let app: INestApplication;
  let userRepository: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.dev' }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    userRepository = moduleFixture.get(getRepositoryToken(User));

    await app.init();
    // Clean up before tests
    await userRepository.delete({ email: 'hybrid.test@example.com' });
  });

  afterAll(async () => {
    await userRepository.delete({ email: 'hybrid.test@example.com' });
    await app.close();
  });

  describe('Hybrid Authentication Flow', () => {
    const testUser = {
      email: 'hybrid.test@example.com',
      password: 'SecurePassword123',
      name: 'Hybrid Test User',
    };

    let accessToken: string;

    it('should complete full hybrid auth flow', async () => {
      // Register
      await request(app.getHttpServer())
        .post('/auth/hybrid/register')
        .send(testUser)
        .expect(201);

      // Login
      const loginRes = await request(app.getHttpServer())
        .post('/auth/hybrid/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201);

      accessToken = loginRes.body.access_token;
      expect(accessToken).toBeDefined();

      // Access protected route
      await request(app.getHttpServer())
        .get('/auth/hybrid/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.strategy).toBe('hybrid');
          expect(res.body.user.tokenId).toBeDefined();
        });

      // Logout (revoke token)
      await request(app.getHttpServer())
        .post('/auth/hybrid/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      // Try to use revoked token - should fail
      await request(app.getHttpServer())
        .get('/auth/hybrid/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('should prevent access with non-whitelisted token', async () => {
      // Login to get a fresh token
      const loginRes = await request(app.getHttpServer())
        .post('/auth/hybrid/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const token = loginRes.body.access_token;

      // Logout to remove from whitelist
      await request(app.getHttpServer())
        .post('/auth/hybrid/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      // Immediate access should fail
      await request(app.getHttpServer())
        .get('/auth/hybrid/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });
});
