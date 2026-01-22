import { ExecutionContext } from '@nestjs/common';
import { SessionAuthGuard } from './session.guard';

describe('SessionAuthGuard', () => {
  let guard: SessionAuthGuard;

  beforeEach(() => {
    guard = new SessionAuthGuard();
  });

  it('should allow access when session has userId', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          session: { userId: 'user-123' },
        }),
      }),
    } as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should deny access when session is missing', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          session: null,
        }),
      }),
    } as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(false);
  });

  it('should deny access when userId is missing from session', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          session: {},
        }),
      }),
    } as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(false);
  });
});