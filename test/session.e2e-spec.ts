import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/users/entities/user.entity';

describe('Session Authentication (e2e)', () => {
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

  describe('Session Authentication Flow', () => {
    const testUser = {
      email: 'session.test@example.com',
      password: 'SecurePassword123',
      name: 'Session Test User',
    };

    const agent = request.agent(app.getHttpServer());

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
          expect(res.body.user.userId).toBeDefined();
        });

      // Logout
      await agent
        .post('/auth/session/logout')
        .expect(200);

      // Try to access after logout - should fail
      await agent
        .get('/auth/session/profile')
        .expect(401);
    });

    it('should fail without session cookie', async () => {
      // Fresh request without cookie
      await request(app.getHttpServer())
        .get('/auth/session/profile')
        .expect(401);
    });
  });
});