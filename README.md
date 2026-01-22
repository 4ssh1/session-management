# Session Management Implementation
What We're Building
A production-ready NestJS application demonstrating four authentication strategies:

- JWT Authentication - Stateless tokens
- Server-Side Sessions - Session store with Redis
- Hybrid Authentication - Combines both approaches
- Access + Refresh Tokens - Token rotation strategy

## Tech Stack
- NestJS - Backend framework
- PostgreSQL - User data storage
- Redis - Session storage
- Passport.js - Authentication middleware
- Bcrypt - Password hashing
- TypeORM - Database ORM
- Docker, Jest, Supertest

## JWT Authentication
### How It Works
Stateless authentication where the token contains all user information. Server verifies token signature without storing state.

- User logs in with credentials
- Server generates JWT with user payload
- Client stores token (localStorage/memory)
- Client sends token in Authorization header
- Server verifies token signature on each request

## Server-Side Sessions
### How It Works
Session ID stored in cookie, session data stored server-side in Redis. Server looks up session on each request.

- User logs in with credentials
- Server creates session in Redis
- Session ID sent as HTTP-only cookie
- Client automatically sends cookie
- Server looks up session in Redis

## Hybrid Authentication
### How It Works
Combines JWT for authentication with server-side tracking for immediate invalidation. Best of both worlds.

- User logs in and receives JWT
- Token ID stored in Redis whitelist
- Client sends JWT in header
- Server verifies JWT signature AND checks whitelist
- Logout removes token from whitelist

## Access + Refresh Tokens
### How It Works
Short-lived access tokens with long-lived refresh tokens. Improves security while maintaining good UX.

- Login returns access token (15min) + refresh token (7days)
- Access token used for API requests
- When access token expires, use refresh token
- Refresh endpoint returns new access token
- Refresh token can be rotated for security


## Test Coverage Summary

### Unit Tests (src/**/*.spec.ts)
UsersService - User CRUD operations and validation
SessionService - Redis token management
AuthService - All authentication strategies
Guards - JWT, Session, Hybrid, Refresh token guards

### Integration Tests (test/integration/)
Auth workflows with real database and Redis
Multi-strategy authentication flows
Token lifecycle management

### E2E Tests (test/*.e2e-spec.ts)
JWT Authentication - Complete flow from registration to logout
Session Authentication - Cookie-based auth with Redis sessions
Hybrid Authentication - Token whitelisting and revocation
Refresh Token - Token rotation and theft detection

## What Each Test Validates

### JWT Tests
- User registration with validation
- Duplicate email prevention
- Login with valid/invalid credentials
- Protected route access with/without token
- Invalid token rejection

### Session Tests
- Cookie-based authentication
- Session persistence across requests
- Session destruction on logout
- Access denial without session

### Hybrid Tests
- Token whitelisting in Redis
- Immediate token revocation
- Access denial with revoked tokens
- Whitelist validation on each request

### Refresh Token Tests
- Dual token issuance (access + refresh)
- Token rotation on refresh
- Old refresh token invalidation
- Token theft detection
- Proper token type validation

## Test Best Practices Applied

1. **Isolation** - Each test is independent
2. **Cleanup** - Test data removed after tests
3. **Mocking** - External dependencies mocked in unit tests
4. **Real Integration** - E2E tests use real DB and Redis
5. **Coverage** - All critical paths tested
6. **Assertions** - Clear, specific expectations
7. **Descriptive Names** - Test names explain what they verify

## Debugging Tests

### View Test Output
```bash
npm test -- --verbose
```

### Run Single Test
```bash
npm test -- --testNamePattern="should register new user"
```

### Debug with Node Inspector
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Expected Test Results

All tests should pass with:
- Unit Tests: ~25 tests
- Integration Tests: ~3 tests
- E2E Tests: ~20 tests
- Total Coverage: >80%

## Notes

- E2E tests require PostgreSQL and Redis running
- Integration tests use test database
- Unit tests are fully mocked (no external deps)
- Tests demonstrate production-ready patterns

## Folder Structure

```
src
 ┣ auth
 ┃ ┣ decorators
 ┃ ┃ ┗ current.user.decorator.ts
 ┃ ┣ dto
 ┃ ┃ ┣ login.dto.ts
 ┃ ┃ ┗ register.dto.ts
 ┃ ┣ entities
 ┃ ┃ ┗ auth.entity.ts
 ┃ ┣ guards
 ┃ ┃ ┣ hybrid.guard.ts
 ┃ ┃ ┣ jwt.guard.spec.ts
 ┃ ┃ ┣ jwt.guard.ts
 ┃ ┃ ┣ refresh-token.guard.ts
 ┃ ┃ ┣ session.guard.spec.ts
 ┃ ┃ ┗ session.guard.ts
 ┃ ┣ interfaces
 ┃ ┃ ┗ jwt.interface.ts
 ┃ ┣ strategies
 ┃ ┃ ┣ hybrid.strategy.ts
 ┃ ┃ ┣ jwt.strategy.ts
 ┃ ┃ ┣ refresh-token.strategy.ts
 ┃ ┃ ┗ session.strategy.ts
 ┃ ┣ auth.controller.spec.ts
 ┃ ┣ auth.controller.ts
 ┃ ┣ auth.module.ts
 ┃ ┣ auth.service.spec.ts
 ┃ ┗ auth.service.ts
 ┣ db
 ┃ ┗ db.module.ts
 ┣ redis
 ┃ ┗ redis.module.ts
 ┣ session
 ┃ ┣ dto
 ┃ ┃ ┣ create-session.dto.ts
 ┃ ┃ ┗ update-session.dto.ts
 ┃ ┣ entities
 ┃ ┃ ┗ session.entity.ts
 ┃ ┣ session.controller.spec.ts
 ┃ ┣ session.controller.ts
 ┃ ┣ session.module.ts
 ┃ ┣ session.service.spec.ts
 ┃ ┗ session.service.ts
 ┣ users
 ┃ ┣ dto
 ┃ ┃ ┣ create-user.dto.ts
 ┃ ┃ ┗ update-user.dto.ts
 ┃ ┣ entities
 ┃ ┃ ┗ user.entity.ts
 ┃ ┣ users.controller.spec.ts
 ┃ ┣ users.controller.ts
 ┃ ┣ users.module.ts
 ┃ ┣ users.service.spec.ts
 ┃ ┗ users.service.ts
 ┣ app.controller.spec.ts
 ┣ app.controller.ts
 ┣ app.module.ts
 ┣ app.service.ts
 ┗ main.ts
```