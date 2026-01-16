import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { SessionService } from '../session/session.service';
import { RegisterDto } from './dto/register.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private sessionService: SessionService,
  ) { }

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    return user.toJSON();
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await user.validatePassword(password)) {
      return user.toJSON();
    }
    return null;
  }

  // JWT Login - Simple stateless token
  async jwtLogin(user: any) {
    const payload = { email: user.email, sub: user.id, name: user.name };
    return {
      access_token: this.jwtService.sign(payload, {
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION'),
      }),
      user,
    };
  }

  // Hybrid Login - JWT with token ID stored in Redis whitelist
  async hybridLogin(user: any) {
    const tokenId = uuidv4();
    const payload = {
      email: user.email,
      sub: user.id,
      name: user.name,
      jti: tokenId, // JWT ID for tracking
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION'),
    });

    // Store token ID in Redis whitelist (15 minutes)
    await this.sessionService.storeTokenWhitelist({
      tokenId,
      userId: user.id,
      expiresIn: 900,
    });

    return { access_token: token, user };
  }

  // Hybrid Logout - Remove token from whitelist
  async hybridLogout(tokenId: string) {
    await this.sessionService.removeTokenWhitelist(tokenId);
  }

  // Refresh Token Login - Returns both access and refresh tokens
  async refreshTokenLogin(user: any) {
    const accessTokenId = uuidv4();
    const refreshTokenId = uuidv4();

    // Access token payload (short-lived)
    const accessPayload = {
      email: user.email,
      sub: user.id,
      name: user.name,
      jti: accessTokenId,
      type: 'access',
    };

    // Refresh token payload (long-lived)
    const refreshPayload = {
      sub: user.id,
      jti: refreshTokenId,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION'),
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION'),
    });

    // Store refresh token in Redis (7 days)
    await this.sessionService.storeRefreshToken({ tokenId: refreshTokenId, userId: user.id, expiresIn: 604800 });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user,
    };
  }

  // Generate new access token from refresh token
  async refreshAccessToken(userId: string, oldTokenId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const accessTokenId = uuidv4();
    const newRefreshTokenId = uuidv4();

    // Generate new access token
    const accessPayload = {
      email: user.email,
      sub: user.id,
      name: user.name,
      jti: accessTokenId,
      type: 'access',
    };

    // Generate new refresh token (rotation)
    const refreshPayload = {
      sub: user.id,
      jti: newRefreshTokenId,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION'),
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION'),
    });

    // Rotate refresh token - remove old, add new
    await this.sessionService.removeRefreshToken(oldTokenId);
    await this.sessionService.storeRefreshToken({
      tokenId: newRefreshTokenId,
      userId: user.id,
      expiresIn: 604800,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  // Refresh Token Logout
  async refreshTokenLogout(tokenId: string) {
    await this.sessionService.removeRefreshToken(tokenId);
  }
}
