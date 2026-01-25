import { Controller, Get, Post, Body, UseGuards, Res, Session, HttpException, HttpStatus } from '@nestjs/common';
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

    return { message: "Session login successful", user };
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
}