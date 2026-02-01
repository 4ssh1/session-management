import { Controller, Get, Post, Body, UseGuards, Res, Session, HttpException, HttpStatus, HttpCode } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt.guard';
import { SessionAuthGuard } from './guards/session.guard';
import { HybridAuthGuard } from './guards/hybrid.guard';
import { CurrentUser } from './decorators/current.user.decorator';
import { RefreshTokenGuard } from './guards/refresh-token.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  //jwt authentication

  @Post("jwt/register")
  async jwtRegister(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("jwt/login")
  async jwtLogin(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }
    return this.authService.jwtLogin(user);
  }

  @Get("jwt/profile")
  @UseGuards(JwtAuthGuard)
  jwtProfile(@CurrentUser() user: any) {
    return {
      message: "JWT authentication successful",
      user,
      strategy: "jwt"
    };
  }

  @Post("jwt/logout")
  jwtLogout() {
    return { message: "JWT logout successful, remove token from client" };
  }

  //session authentication

  @Post("session/register")
  async sessionRegister(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("session/login")
  async sessionLogin(
    @Body() dto: LoginDto,
    @Session() session: Record<string, any>
  ) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    session.userId = user.id;
    session.email = user.email;

    return { message: "Login successful", user };
  }

  @Get("session/profile")
  @UseGuards(SessionAuthGuard)
  sessionProfile(@Session() session: Record<string, any>) {
    return {
      message: "Session authentication successful",
      user: {
        id: session.userId,
        email: session.email
      },
      strategy: "session"
    };
  }

  @Post("session/logout")
  @HttpCode(200)
  async sessionLogout(@Session() session: Record<string, any>) {
    return new Promise((resolve, reject) => {
      session.destroy((err: any) => {
        if (err) {
          reject({ message: "Logout failed" });
        } else {
          // Cookie clearing is handled by session middleware
          resolve({ message: "Session logout successful" });
        }
      });
    });
  }

  // ==================== HYBRID AUTHENTICATION ====================
  
  @Post('hybrid/register')
  async hybridRegister(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('hybrid/login')
  async hybridLogin(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    return this.authService.hybridLogin(user);
  }

  @Get('hybrid/profile')
  @UseGuards(HybridAuthGuard)
  hybridProfile(@CurrentUser() user: any) {
    return {
      message: 'Hybrid Authentication successful',
      user,
      strategy: 'hybrid',
      note: 'Token is validated AND checked against Redis whitelist',
    };
  }

  @Post('hybrid/logout')
  @UseGuards(HybridAuthGuard)
  async hybridLogout(@CurrentUser() user: any) {
    await this.authService.hybridLogout(user.tokenId);
    return { message: 'Logout successful. Token removed from whitelist.' };
  }

  // ==================== REFRESH TOKEN AUTHENTICATION ====================
  
  @Post('refresh/register')
  async refreshRegister(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('refresh/login')
  async refreshLogin(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    return this.authService.refreshTokenLogin(user);
  }

  @Get('refresh/profile')
  @UseGuards(JwtAuthGuard)
  refreshProfile(@CurrentUser() user: any) {
    return {
      message: 'Access token validated',
      user,
      strategy: 'refresh-token',
      note: 'Use short-lived access token for API calls',
    };
  }

  @Post('refresh/refresh')
  @UseGuards(RefreshTokenGuard)
  async refreshTokens(@CurrentUser() user: any) {
    return this.authService.refreshAccessToken(user.userId, user.tokenId);
  }

  @Post('refresh/logout')
  @UseGuards(RefreshTokenGuard)
  async refreshLogout(@CurrentUser() user: any) {
    await this.authService.refreshTokenLogout(user.tokenId);
    return { message: 'Logout successful. Refresh token invalidated.' };
  }
}