import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SessionService } from './session.service';
import { connect } from 'http2';

describe('SessionService', () => {
  let service: SessionService;
  let mockRedisClient: any;


  beforeEach(async () => {
    mockRedisClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      setEx: jest.fn().mockResolvedValue("OK"),
      get: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              const config = {
                'redis.host': 'localhost',
                'redis.port': 6379,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    // Override the redisClient with the mock
    (service as any).redisClient = mockRedisClient;
  });

  describe('Token Whitelist Operations', () => {
    it('should store token in whitelist', async () => {
      await service.storeTokenWhitelist({ tokenId: 'token-123', userId: 'user-456', expiresIn: 900 });

      expect(mockRedisClient.setEx).toHaveBeenCalledWith('whitelist:token-123', 900, 'user-456');
    });

    it('should check if token is whitelisted (true)', async () => {
      mockRedisClient.get.mockResolvedValue('user-456');

      const result = await service.isTokenWhitelisted('token-123');

      expect(mockRedisClient.get).toHaveBeenCalledWith('whitelist:token-123');
      expect(result).toBe(true);
    });

    it('should check if token is whitelisted (false)', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.isTokenWhitelisted('token-789');

      expect(result).toBe(false);
    });

    it('should remove token from whitelist', async () => {
      await service.removeTokenWhitelist('token-123');

      expect(mockRedisClient.del).toHaveBeenCalledWith('whitelist:token-123');
    });
  });

  describe('Refresh Token Operations', () => {
    it('should store refresh token', async () => {
      await service.storeRefreshToken({ tokenId: 'refresh-123', userId: 'user-456', expiresIn: 604800 });

      expect(mockRedisClient.setEx).toHaveBeenCalledWith('refresh:refresh-123', 604800, 'user-456');
    });

    it('should get user ID from refresh token', async () => {
      mockRedisClient.get.mockResolvedValue('user-456');

      const result = await service.getRefreshToken('refresh-123');

      expect(mockRedisClient.get).toHaveBeenCalledWith('refresh:refresh-123');
      expect(result).toBe('user-456');
    });

    it('should return null when refresh token not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.getRefreshToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should remove refresh token', async () => {
      await service.removeRefreshToken('refresh-123');

      expect(mockRedisClient.del).toHaveBeenCalledWith('refresh:refresh-123');
    });
  });
});
