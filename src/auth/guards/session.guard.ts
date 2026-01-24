import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return !!(request.session && request.session.userId);
  }
}