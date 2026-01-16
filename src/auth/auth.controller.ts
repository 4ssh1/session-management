import { Controller, Get, Post, Body, UseGuards, Req, Res, Session } from '@nestjs/common';
import { AuthService } from './auth.service';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  
}
