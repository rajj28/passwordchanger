# Test Suite Outline

## Test Architecture

- **Framework**: Jest with ts-jest
- **Coverage Target**: 90%+ for critical paths
- **Test Types**: Unit, Integration, E2E
- **Mock Strategy**: Redis/MongoDB in-memory, Nodemailer stub

---

## Unit Tests

### 1. Configuration & Utilities

```typescript
describe('config', () => {
  it('should validate required environment variables');
  it('should reject JWT_SECRET shorter than 32 bytes');
  it('should parse CORS_ORIGINS correctly');
  it('should calibrate bcrypt cost factor');
  it('should fallback to env BCRYPT_COST on calibration failure');
  it('should generate benchmark table');
});

describe('logger', () => {
  it('should sanitize sensitive fields from context');
  it('should redact passwords in logs');
  it('should redact authorization headers');
  it('should include requestId in all logs');
});
```

### 2. Models

```typescript
describe('UserModel', () => {
  describe('password hashing', () => {
    it('should hash password with calibrated cost factor');
    it('should use constant-time comparison');
    it('should reject passwords exceeding 72 bytes');
    it('should reject passwords with null bytes');
    it('should enforce minimum 6 character length');
    it('should enforce maximum 64 character length');
  });

  describe('password history', () => {
    it('should store new password in history on change');
    it('should limit history to 5 entries');
    it('should detect password in history');
    it('should handle empty history for new users');
    it('should compare history entries in parallel');
  });

  describe('validation', () => {
    it('should normalize username to lowercase');
    it('should reject invalid username characters');
    it('should enforce username length limits');
    it('should require unique username');
  });

  describe('session versioning', () => {
    it('should default sessionVersion to 0');
    it('should increment sessionVersion atomically');
  });
});

describe('PasswordChangeAuditModel', () => {
  it('should require all mandatory fields');
  it('should reject invalid status values');
  it('should enforce unique requestId');
  it('should support compound index queries');
  it('should retrieve recent history for user');
  it('should count failed attempts for user');
});
```

### 3. Middleware

```typescript
describe('authMiddleware', () => {
  it('should reject requests without authorization header');
  it('should reject malformed authorization header');
  it('should reject expired JWT tokens');
  it('should reject invalid JWT signatures');
  it('should reject JWT with mismatched sessionVersion');
  it('should reject deactivated user accounts');
  it('should attach user to request on success');
  it('should add timing delay on auth failures');
});

describe('rateLimiter', () => {
  describe('ipRateLimiter', () => {
    it('should allow requests under limit');
    it('should block requests over limit');
    it('should set correct rate limit headers');
    it('should use sliding window algorithm');
    it('should reset counter after window expires');
  });

  describe('userRateLimiter', () => {
    it('should track limits per userId');
    it('should allow authenticated requests under limit');
    it('should block user after 3 failed attempts');
    it('should have 1 hour window');
  });

  describe('combined rate limiting', () => {
    it('should satisfy both IP and user limits');
    it('should fail if either limit exceeded');
  });
});

describe('validationMiddleware', () => {
  it('should normalize unicode input to NFC');
  it('should reject passwords with null bytes');
  it('should reject passwords over 72 bytes');
  it('should reject mismatched passwords');
  it('should reject new password same as old');
  it('should return structured validation errors');
});

describe('errorHandler', () => {
  it('should format operational errors correctly');
  it('should hide stack traces in production');
  it('should include requestId in all errors');
  it('should handle unexpected error types');
  it('should add timing delay for auth errors');
});
```

---

## Integration Tests

### 4. Database Layer

```typescript
describe('Database Integration', () => {
  describe('MongoDB', () => {
    it('should connect with retry logic');
    it('should handle connection failures gracefully');
    it('should execute transactions atomically');
    it('should rollback on transaction failure');
    it('should handle concurrent modifications');
  });

  describe('Redis', () => {
    it('should connect successfully');
    it('should implement sliding window rate limiting');
    it('should handle Redis failures gracefully');
    it('should store and retrieve idempotency keys');
  });
});
```

### 5. Services

```typescript
describe('EmailService', () => {
  it('should initialize transporter successfully');
  it('should send password change notification');
  it('should mask email in logs');
  it('should handle SMTP failures gracefully');
  it('should retry on transient failures');
});
```

### 6. Controller

```typescript
describe('passwordChangeController', () => {
  describe('happy path', () => {
    it('should change password with valid credentials');
    it('should increment sessionVersion');
    it('should invalidate old JWTs');
    it('should add old password to history');
    it('should create audit record');
    it('should send notification email');
    it('should return new JWT token');
  });

  describe('validation failures', () => {
    it('should reject incorrect old password');
    it('should reject password in history');
    it('should reject weak passwords');
    it('should reject mismatched passwords');
    it('should reject same password');
  });

  describe('concurrency & race conditions', () => {
    it('should handle concurrent password changes');
    it('should detect session version mismatch mid-request');
    it('should handle account deactivation mid-request');
    it('should use idempotency key for duplicates');
  });

  describe('transaction handling', () => {
    it('should rollback on audit write failure');
    it('should rollback on user update failure');
    it('should commit only when all operations succeed');
  });

  describe('edge cases', () => {
    it('should handle bcrypt.hash throwing');
    it('should handle MongoDB timeout mid-transaction');
    it('should handle Redis failure gracefully');
    it('should handle email failure without rollback');
    it('should handle empty password history');
    it('should handle unicode passwords correctly');
  });
});
```

---

## E2E Tests

### 7. API Endpoints

```typescript
describe('POST /api/v1/auth/change-password', () => {
  describe('authentication', () => {
    it('should reject without authentication');
    it('should reject with expired token');
    it('should reject with invalid token');
    it('should reject with stale session version');
  });

  describe('rate limiting', () => {
    it('should allow 5 requests per 15 min per IP');
    it('should block 6th request from same IP');
    it('should allow 3 requests per hour per user');
    it('should block 4th request from same user');
    it('should return correct rate limit headers');
  });

  describe('input validation', () => {
    it('should reject missing oldPassword');
    it('should reject missing newPassword');
    it('should reject missing confirmPassword');
    it('should reject passwords under 6 characters');
    it('should reject passwords over 64 characters');
    it('should reject passwords over 72 bytes');
    it('should reject passwords with null bytes');
  });

  describe('security headers', () => {
    it('should include X-Request-ID header');
    it('should include security headers (CSP, HSTS, etc.)');
    it('should not expose X-Powered-By');
    it('should set no-cache headers');
  });

  describe('timing attacks', () => {
    it('should have similar response times for different errors');
    it('should add delay for authentication failures');
  });
});

describe('GET /api/v1/auth/password-history', () => {
  it('should return sanitized history for authenticated user');
  it('should not include password hashes in response');
  it('should paginate results');
  it('should reject unauthenticated requests');
});
```

---

## Test Data & Fixtures

```typescript
// fixtures/users.ts
export const testUsers = {
  valid: {
    username: 'testuser',
    password: 'SecurePass123!',
    passwordHash: '$2b$12$...', // pre-computed
    sessionVersion: 0,
  },
  withHistory: {
    // user with 5 previous passwords
  },
  deactivated: {
    isActive: false,
  },
};

// fixtures/tokens.ts
export const generateTestToken = (overrides?: Partial<JWTPayload>) => {
  return jwt.sign(
    {
      sub: 'user-id',
      username: 'testuser',
      sv: 0,
      ...overrides,
    },
    process.env.JWT_SECRET
  );
};
```

---

## Test Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific suite
npm test -- authMiddleware

# Run integration tests only
npm test -- --testPathPattern=integration

# Run E2E tests (requires running services)
npm run test:e2e

# Watch mode
npm run test:watch
```

---

## Coverage Requirements

| Path | Target | Critical Files |
|------|--------|----------------|
| `src/controllers/` | 95% | `passwordChangeController.ts` |
| `src/middleware/` | 90% | `auth.ts`, `rateLimiter.ts`, `validation.ts` |
| `src/models/` | 90% | `User.ts`, `PasswordChangeAudit.ts` |
| `src/services/` | 85% | `email.ts` |
| `src/utils/` | 80% | `logger.ts` |
| Total | 90% | - |

---

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongo:
        image: mongo:7
        ports: ['27017:27017']
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```
