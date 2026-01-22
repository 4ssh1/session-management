import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/users/entities/user.entity';

describe('Refresh Token Authentication (e2e)', () => {
  let app: INestApplication;
  let userRepository: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    
    userRepository = moduleFixture.get(getRepositoryToken(User));
    
    await app.init();
  });

  afterAll(async () => {
    await userRepository.delete({});
    await app.close();
  });

  describe('Refresh Token Flow', () => {
    const testUser = {
      email: 'refresh.test@example.com',
      password: 'SecurePassword123',
      name: 'Refresh Test User',
    };

    let accessToken: string;
    let refreshToken: string;

    it('should issue access and refresh tokens on login', async () => {
      // Register
      await request(app.getHttpServer())
        .post('/auth/refresh/register')
        .send(testUser)
        .expect(201);

      // Login
      const loginRes = await request(app.getHttpServer())
        .post('/auth/refresh/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201);

      expect(loginRes.body).toHaveProperty('access_token');
      expect(loginRes.body).toHaveProperty('refresh_token');
      expect(loginRes.body).toHaveProperty('user');

      accessToken = loginRes.body.access_token;
      refreshToken = loginRes.body.refresh_token;
    });

    it('should access protected route with access token', () => {
      return request(app.getHttpServer())
        .get('/auth/refresh/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should refresh access token using refresh token', async () => {
      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(201);

      expect(refreshRes.body).toHaveProperty('access_token');
      expect(refreshRes.body).toHaveProperty('refresh_token');

      // Old refresh token should be different from new one
      expect(refreshRes.body.refresh_token).not.toBe(refreshToken);

      // Update tokens
      const oldRefreshToken = refreshToken;
      accessToken = refreshRes.body.access_token;
      refreshToken = refreshRes.body.refresh_token;

      // Try using old refresh token - should fail (rotation)
      await request(app.getHttpServer())
        .post('/auth/refresh/refresh')
        .set('Authorization', `Bearer ${oldRefreshToken}`)
        .expect(401);
    });

    it('should detect token theft (old refresh token reuse)', async () => {
      // Get initial tokens
      const loginRes = await request(app.getHttpServer())
        .post('/auth/refresh/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const firstRefresh = loginRes.body.refresh_token;

      // First refresh - should succeed
      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh/refresh')
        .set('Authorization', `Bearer ${firstRefresh}`)
        .expect(201);

      // Try to use the old refresh token again - should fail
      await request(app.getHttpServer())
        .post('/auth/refresh/refresh')
        .set('Authorization', `Bearer ${firstRefresh}`)
        .expect(401);
    });

    it('should logout and invalidate refresh token', async () => {
      // Login fresh
      const loginRes = await request(app.getHttpServer())
        .post('/auth/refresh/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const logoutRefresh = loginRes.body.refresh_token;

      // Logout
      await request(app.getHttpServer())
        .post('/auth/refresh/logout')
        .set('Authorization', `Bearer ${logoutRefresh}`)
        .expect(201);

      // Try to use refresh token after logout - should fail
      await request(app.getHttpServer())
        .post('/auth/refresh/refresh')
        .set('Authorization', `Bearer ${logoutRefresh}`)
        .expect(401);
    });

    it('should fail to refresh with access token', async () => {
      // Try using access token on refresh endpoint - should fail
      await request(app.getHttpServer())
        .post('/auth/refresh/refresh')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });
});