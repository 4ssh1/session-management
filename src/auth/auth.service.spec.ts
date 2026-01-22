import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { SessionService } from '../session/session.service';

// Unit Test: Auth Service
// Tests authentication logic for all strategies

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let sessionService: SessionService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    validatePassword: jest.fn(),
    toJSON: jest.fn().mockReturnValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    }),
  };

  const mockUsersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    updateRefreshToken: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockSessionService = {
    storeTokenWhitelist: jest.fn(),
    removeTokenWhitelist: jest.fn(),
    storeRefreshToken: jest.fn(),
    removeRefreshToken: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key) => {
      const config = {
        'jwt.accessExpiration': '15m',
        'jwt.refreshExpiration': '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    sessionService = module.get<SessionService>(SessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(usersService.create).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.password,
        registerDto.name,
      );
      expect(result).toEqual(mockUser.toJSON());
    });
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUser.validatePassword.mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUser.validatePassword).toHaveBeenCalledWith('password123');
      expect(result).toEqual(mockUser.toJSON());
    });

    it('should return null when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('notfound@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUser.validatePassword.mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('jwtLogin', () => {
    it('should return JWT token and user', async () => {
      const user = mockUser.toJSON();
      mockJwtService.sign.mockReturnValue('jwt-token-123');

      const result = await service.jwtLogin(user);

      expect(jwtService.sign).toHaveBeenCalledWith(
        { email: user.email, sub: user.id, name: user.name },
        { expiresIn: '15m' },
      );
      expect(result).toEqual({
        access_token: 'jwt-token-123',
        user,
      });
    });
  });

  describe('hybridLogin', () => {
    it('should return JWT token and store in whitelist', async () => {
      const user = mockUser.toJSON();
      mockJwtService.sign.mockReturnValue('hybrid-token-123');

      const result = await service.hybridLogin(user);

      expect(jwtService.sign).toHaveBeenCalled();
      expect(sessionService.storeTokenWhitelist).toHaveBeenCalledWith(
        expect.any(String),
        user.id,
        900,
      );
      expect(result).toEqual({
        access_token: 'hybrid-token-123',
        user,
      });
    });
  });

  describe('hybridLogout', () => {
    it('should remove token from whitelist', async () => {
      await service.hybridLogout('token-123');

      expect(sessionService.removeTokenWhitelist).toHaveBeenCalledWith('token-123');
    });
  });

  describe('refreshTokenLogin', () => {
    it('should return access and refresh tokens', async () => {
      const user = mockUser.toJSON();
      mockJwtService.sign
        .mockReturnValueOnce('access-token-123')
        .mockReturnValueOnce('refresh-token-456');

      const result = await service.refreshTokenLogin(user);

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(sessionService.storeRefreshToken).toHaveBeenCalled();
      expect(result).toHaveProperty('access_token', 'access-token-123');
      expect(result).toHaveProperty('refresh_token', 'refresh-token-456');
      expect(result).toHaveProperty('user', user);
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new tokens and rotate refresh token', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await service.refreshAccessToken('user-123', 'old-token-id');

      expect(usersService.findById).toHaveBeenCalledWith('user-123');
      expect(sessionService.removeRefreshToken).toHaveBeenCalledWith('old-token-id');
      expect(sessionService.storeRefreshToken).toHaveBeenCalled();
      expect(result).toHaveProperty('access_token', 'new-access-token');
      expect(result).toHaveProperty('refresh_token', 'new-refresh-token');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(
        service.refreshAccessToken('invalid-user', 'token-id')
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});