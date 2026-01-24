# Session Management Implementation
A  NestJS application demonstrating four authentication strategies:

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

**Pros & Cons**
- Pros: Scalable, no server state, works across domains
- Cons: Cannot invalidate tokens, token size, vulnerable if stolen

## Server-Side Sessions
### How It Works
Session ID stored in cookie, session data stored server-side in Redis. Server looks up session on each request.

- User logs in with credentials
- Server creates session in Redis
- Session ID sent as HTTP-only cookie
- Client automatically sends cookie
- Server looks up session in Redis

**Pros & Cons**
- Pros: Can invalidate immediately, secure cookies, server control
- Cons: Not scalable without sticky sessions, requires session store

## Hybrid Authentication
### How It Works
Combines JWT for authentication with server-side tracking for immediate invalidation. Best of both worlds.

- User logs in and receives JWT
- Token ID stored in Redis whitelist
- Client sends JWT in header
- Server verifies JWT signature AND checks whitelist
- Logout removes token from whitelist

**Pros & Cons**
- Pros: Scalable like JWT, can invalidate like sessions
- Cons: Requires Redis lookup, more complex


## Access + Refresh Tokens
### How It Works
Short-lived access tokens with long-lived refresh tokens. Improves security while maintaining good UX.

- Login returns access token (15min) + refresh token (7days)
- Access token used for API requests
- When access token expires, use refresh token
- Refresh endpoint returns new access token
- Refresh token can be rotated for security

**Pros & Cons**
- Pros: Limited damage if access token stolen, can revoke refresh tokens
- Cons: More complex implementation, requires refresh token storage

### Token Rotation
Each time refresh token is used, issue new refresh token and invalidate old one. Detects token theft if old refresh token is reused.

## Key Directories
- strategies/ - Passport authentication strategies
- guards/ - Route protection mechanisms
- decorators/ - Custom parameter decorators
- dto/ - Data transfer objects for validation

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

## Folder Structure

```
src
 ┣ auth
 ┃ ┣ decorators
 ┃ ┃ ┗ current.user.decorator.ts
 ┃ ┣ dto
 ┃ ┃ ┣ login.dto.ts
 ┃ ┃ ┗ register.dto.ts
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

## Contribution
### Installation
1. Clone the repository
2. Run `pnpm install`
3. Copy `.env.example` and adjust as needed
4. Start Docker containers: `pnpm docker:up`
5. Generate and run migrations if needed
6. Start the app: `pnpm start:dev`
