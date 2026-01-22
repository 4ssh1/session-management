import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockUser = {
    id: "123",
    email: "test@example.com",
    name: "Test User",
    password: "hashedpassword",
    createdAt: new Date(),
    updatedAt: new Date(),
    validatePassword: jest.fn(),
    toJSON: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, {
        provide: getRepositoryToken(User),
        useValue: mockRepository,
      }],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create-user", () => {

    it("should create a new user", async () => {
      mockRepository.findOne.mockResolvedValue(undefined);
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.create({
        email: "test@example.com",
        name: "Test User",
        password: "password",
      });

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { email: "test@example.com" } });
      expect(mockRepository.create).toHaveBeenCalledWith({
        email: "test@example.com",
        name: "Test User",
        password: "password",
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it("should throw conflictException if user exists", async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.create({
        email: "test@example.com",
        name: "Test User",
        password: "password",
      })).rejects.toThrow(ConflictException);

      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe("find-by-email", () => {

    it("should return user if found", async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail("test@example.com");

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { email: "test@example.com" } });
      expect(result).toEqual(mockUser);
    });

    it("should return null if user not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail("nonexistent@example.com");

      expect(result).toBeNull();
    });
  });

  describe("find-by-id", () => {
    it("should return user if found", async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById("123");

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: "123" } });
      expect(result).toEqual(mockUser);
    });
  })

  describe("update-refresh-token", () => {
    it("should update the user's refresh token", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateRefreshToken("123", "new-refresh-token");
      expect(repository.update).toHaveBeenCalledWith("123", { refreshToken: "new-refresh-token" });
    });

    it("should handle non-existing user gracefully", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateRefreshToken("123", "null");
      expect(repository.update).toHaveBeenCalledWith("123", { refreshToken: null });
    });
  });
});