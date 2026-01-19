import { Controller, Get, Post, Body, UseGuards, Req, Res, Session } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt.guard';
import { SessionAuthGuard } from './guards/session.guard';
import { HybridAuthGuard } from './guards/hybrid.guard';
import { CurrentUser } from './decorators/current.user.decorator';
import { RefreshTokenGuard } from './guards/refresh-token.guard';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  //jwt authentication

  @Post("jwt/register")
  async jwtRegister(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("jwt/login")
  async jwtLogin(@Body() dto:LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user) {
      throw new Error('Invalid credentials');
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
}
