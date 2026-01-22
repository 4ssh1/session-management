import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/users/entities/user.entity';

describe('JWT Authentication (e2e)', () => {
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
    // Clean up test data
    await userRepository.delete({});
    await app.close();
  });

  describe('JWT Authentication Flow', () => {
    const testUser = {
      email: 'jwt.test@example.com',
      password: 'SecurePassword123',
      name: 'JWT Test User',
    };

    let accessToken: string;

    it('/auth/jwt/register (POST) - should register new user', () => {
      return request(app.getHttpServer())
        .post('/auth/jwt/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email', testUser.email);
          expect(res.body).toHaveProperty('name', testUser.name);
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('/auth/jwt/register (POST) - should fail with duplicate email', () => {
      return request(app.getHttpServer())
        .post('/auth/jwt/register')
        .send(testUser)
        .expect(409);
    });

    it('/auth/jwt/register (POST) - should validate input', () => {
      return request(app.getHttpServer())
        .post('/auth/jwt/register')
        .send({
          email: 'invalid-email',
          password: 'short',
          name: 'T',
        })
        .expect(400);
    });

    it('/auth/jwt/login (POST) - should login and return token', () => {
      return request(app.getHttpServer())
        .post('/auth/jwt/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe(testUser.email);
          accessToken = res.body.access_token;
        });
    });

    it('/auth/jwt/login (POST) - should fail with wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/jwt/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(500);
    });

    it('/auth/jwt/profile (GET) - should access protected route with token', () => {
      return request(app.getHttpServer())
        .get('/auth/jwt/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'JWT Authentication successful');
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('strategy', 'jwt');
        });
    });

    it('/auth/jwt/profile (GET) - should fail without token', () => {
      return request(app.getHttpServer())
        .get('/auth/jwt/profile')
        .expect(401);
    });

    it('/auth/jwt/profile (GET) - should fail with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/jwt/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
