import { Controller, Get, Post, Body, UseGuards, Req, Res, Session } from '@nestjs/common';
import { Request } from 'express';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt.guard';
import { SessionAuthGuard } from './guards/session.guard';
import { HybridAuthGuard } from './guards/hybrid.guard';
import { CurrentUser } from './decorators/current.user.decorator';
import { RefreshTokenGuard } from './guards/refresh-token.guard';

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
      throw new Error('Invalid credentials');
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
  sessionLogout(@Session() session: Record<string, any>, 
    @Res() res: Response) {
    session.destroy((err) => {
      if (err) {
        return res.status(500).send({ message: "Logout failed" });
      } 
      res.clearCookie('connect.sid');
      return res.send({ message: "Session logout successful" });
    });
  }
}