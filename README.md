# Session Management Implementation

A **NestJS** application demonstrating four robust authentication strategies:

- **JWT Authentication** (Stateless tokens)
- **Server-Side Sessions** (Session store with Redis)
- **Hybrid Authentication** (Combines both approaches)
- **Access + Refresh Tokens** (Token rotation strategy)

---

## Getting Started

### 1. Clone This Repository
```bash
git clone https://github.com/4ssh1/session-management.git
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Setup Environment
- Copy `.env.example` to `.env` and adjust configuration as needed

### 4. Start Required Services
```bash
pnpm docker:up
```

### 5. Migrations (if needed)
- Generate and run migrations as required

### 6. Run the App
```bash
pnpm start:dev
```

### 7. Run Tests

**Run all unit tests:**  
```bash
pnpm test 
```
**Run end-to-end tests:**  
```bash
pnpm test:e2e
```
---

## Tech Stack

- **NestJS** – Backend framework
- **PostgreSQL** – User data storage
- **Redis** – Session storage
- **Passport.js** – Authentication middleware
- **Bcrypt** – Password hashing
- **TypeORM** – Database ORM
- **Docker, Jest, Supertest** – DevOps & Testing

---

## Key Directories

- `strategies/` – Passport authentication strategies
- `guards/` – Route protection logic
- `decorators/` – Custom decorators (e.g., current user extraction)
- `dto/` – Data transfer objects for validation

---

## Authentication Strategies

### 1. JWT Authentication

#### How It Works

Stateless authentication: the token itself carries all necessary user information. The server verifies the token's signature without maintaining a session.

**Flow:**
1. User logs in with credentials
2. Server generates a JWT with user payload
3. Client stores token (e.g., localStorage)
4. Client sends token in the `Authorization` header on each request
5. Server verifies the token’s signature

**Pros**
- Scalable (no server session state)
- Works across domains

**Cons**
- Cannot easily invalidate tokens
- Token size can be large
- Compromised tokens can allow unauthorized access

---

### 2. Server-Side Sessions

#### How It Works

A session ID is stored in a secure HTTP-only cookie, while session data is kept on the server (Redis). Each request validates the session via Redis.

**Flow:**
1. User logs in
2. Server creates a session in Redis
3. Session ID sent to client (HTTP-only cookie)
4. Client sends cookie automatically
5. Server validates session with Redis on each request

**Pros**
- Immediate session invalidation
- Server-controlled security (e.g., secure cookies)

**Cons**
- Can require sticky sessions for scalability
- Needs session storage

---

### 3. Hybrid Authentication

#### How It Works

Leverages JWT for stateless authentication but stores token IDs in Redis whitelist for revocation.

**Flow:**
1. User logs in, receives JWT
2. Token ID stored in Redis whitelist
3. Each request: server checks JWT validity *and* Redis whitelist
4. Logout removes token from whitelist

**Pros**
- Scalable as JWT
- Immediate revocation

**Cons**
- Redis lookup on each request
- More complex setup

---

### 4. Access + Refresh Tokens

#### How It Works

A "Best Practice" strategy: short-lived access tokens for requests, long-lived refresh tokens for renewal.

**Flow:**
1. Login issues access (e.g., 15m) & refresh tokens (e.g., 7d)
2. API requests use access token
3. Expired access token can be renewed with refresh token
4. Server issues new access (& optionally refresh) tokens on renewal

**Token Rotation:**
- On refresh, the server issues a new refresh token and invalidates the old
- Attempts to reuse an old refresh token can be detected (token theft)

**Pros**
- Minimal damage if access token compromised
- Refresh tokens can be revoked for security

**Cons**
- More complex implementation
- Secure storage for refresh tokens required

---

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

---


## Test Coverage

### JWT Authentication
- User registration & validation
- Duplicate email prevention
- Login with valid/invalid credentials
- Access for protected routes
- Invalid token rejection

### Server-Side Sessions
- Cookie-based auth
- Session persistence
- Logout and session destruction
- Denial without valid session

### Hybrid Auth
- Token whitelisting
- Immediate token revocation
- Denial with revoked/JWT
- Whitelist checks on every request

### Refresh Token
- Access & refresh token issuance
- Rotation on refresh
- Invalidating stale refresh tokens
- Token theft checks
- Validation of token type

---

## 🧑‍🔬 Test Best Practices

1. **Isolation:** Each test is independent
2. **Cleanup:** Cleans up test data
3. **Mocking:** External dependencies are mocked for unit tests
4. **Real Integration:** E2E tests use real DB/Redis
5. **Coverage:** All critical flows tested
6. **Assertions:** Clear, direct expectations
7. **Naming:** Descriptive, self-explanatory test names

---

## 🤝 Contribution

Contributions welcome! Please open an issue or submit a pull request to help improve this project.

---
