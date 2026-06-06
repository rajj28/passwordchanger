# Architecture Decision Log

## AD-001: JWT Session Versioning for Token Invalidation

**Decision**: Implement `sessionVersion` integer in user documents that increments on password change.

**Rationale**: 
- When a user changes their password, all existing sessions must be invalidated immediately
- Storing session tokens in a database creates write-heavy collections and complicates horizontal scaling
- Session versioning allows atomic invalidation: increment one integer invalidates all JWTs simultaneously

**Trade-offs**:
- ✅ Atomic operation, no race conditions
- ✅ No additional database queries per auth check
- ✅ Scales horizontally without shared state
- ❌ Requires database read for session version on every authenticated request
- ❌ Slightly larger JWT payload

**Implementation**: JWT includes `sv` claim; middleware rejects tokens where `sv < user.sessionVersion`

---

## AD-002: Bcrypt Cost Factor Calibration

**Decision**: Auto-calibrate bcrypt cost factor at startup to achieve ~250ms hash time on current hardware.

**Rationale**:
- Fixed cost factors become obsolete as hardware improves
- OWASP recommends minimum cost of 10, but this is insufficient for modern hardware
- ~250ms provides security/performance balance for 2025 hardware

**Trade-offs**:
- ✅ Automatically adapts to deployment hardware
- ✅ Consistent security level regardless of environment
- ✅ Documented benchmark table for transparency
- ❌ Slightly longer startup time (~1-2 seconds)
- ❌ Different servers may have different cost factors in load-balanced deployments

**Implementation**: Sequential benchmarking at startup; cached result; fallback to env variable

---

## AD-003: Dual-Key Rate Limiting (IP + User)

**Decision**: Implement two independent rate limits: 5/15min per IP AND 3/1hr per user.

**Rationale**:
- IP-based limits prevent brute force from single source
- User-based limits prevent credential stuffing across distributed IPs
- Must satisfy both limits to proceed

**Trade-offs**:
- ✅ Defense in depth against different attack vectors
- ✅ Prevents bypass via proxy rotation or botnets
- ✅ Clear user feedback ("too many attempts" vs "too many from your account")
- ❌ Requires Redis for distributed rate limiting
- ❌ Slightly more complex implementation

**Implementation**: Redis sorted sets with sliding window; pipeline for atomic operations

---

## AD-004: MongoDB Multi-Document Transactions

**Decision**: Use MongoDB 4.0+ transactions for password change operations.

**Rationale**:
- Password change requires: update user + add to history + increment version + write audit
- Partial writes are unacceptable (e.g., password changed but no audit log)
- Transactions provide ACID guarantees across collections

**Trade-offs**:
- ✅ All-or-nothing consistency
- ✅ Automatic rollback on error
- ✅ Proper handling of concurrent modifications
- ❌ Requires MongoDB 4.0+ with replica set
- ❌ Slight performance overhead (~10-20ms)
- ❌ Must be used with replica sets (single-node dev needs special handling)

**Implementation**: `withTransaction()` helper using MongoDB sessions

---

## AD-005: Password History Storage (Last 5 Hashes)

**Decision**: Store last 5 password hashes in user document, reject new passwords found in history.

**Rationale**:
- Prevents password cycling (password1 → password2 → password1)
- NIST SP 800-63B recommends checking against "previous passwords"
- More than 5 creates storage bloat; fewer reduces security

**Trade-offs**:
- ✅ Prevents trivial password rotation
- ✅ Embedded in user document (no join/query needed)
- ✅ MongoDB `$slice` operator keeps array bounded automatically
- ❌ Slightly larger user documents (~500 bytes per entry)
- ❌ bcrypt comparison overhead for history checks (parallelized)

**Implementation**: `$push` with `$slice: -5` in update operation

---

## AD-006: Idempotency Keys for Duplicate Prevention

**Decision**: Support `X-Idempotency-Key` header; store in Redis for 15 minutes.

**Rationale**:
- Network timeouts may cause clients to retry successful requests
- Double password change could lock users out (if email also sent twice)
- Idempotency ensures same response returned for duplicate requests

**Trade-offs**:
- ✅ Prevents accidental double-changes
- ✅ Allows safe client-side retries
- ✅ Simple Redis-based implementation
- ❌ Requires client to generate UUIDs
- ❌ Additional Redis write per request

**Implementation**: `SET key 1 EX 900 NX` pattern; optionally cache response

---

## AD-007: Timing-Safe Error Responses

**Decision**: Add 50-100ms random delay for authentication errors; uniform error messages.

**Rationale**:
- Timing attacks can distinguish "user not found" vs "wrong password" by response time
- bcrypt.compare takes ~250ms; other paths must match this timing
- Uniform error messages prevent user enumeration

**Trade-offs**:
- ✅ Prevents user enumeration via timing analysis
- ✅ Prevents username enumeration via error messages
- ❌ Slightly slower error responses
- ❌ Cannot use early-exit optimizations

**Implementation**: `setTimeout(() => res.status(401).json(...), 50 + Math.random() * 50)`

---

## AD-008: Separate Audit Collection

**Decision**: Store password change audits in separate collection, not embedded in user document.

**Rationale**:
- Audit trail grows indefinitely; user document should stay bounded
- Compliance requires immutable audit logs
- Separate collection allows time-based TTL and archiving

**Trade-offs**:
- ✅ User documents stay small and fast
- ✅ Can apply different storage policies (e.g., S3 archive after 1 year)
- ✅ Partial indexes on status for efficient queries
- ❌ Requires transaction to keep user + audit consistent
- ❌ Additional query needed to fetch history

**Implementation**: `password_change_audit` collection with compound indexes

---

## AD-009: Unicode Normalization (NFC)

**Decision**: Normalize all passwords to NFC form before hashing and validation.

**Rationale**:
- Unicode characters can have multiple byte representations (e.g., é as single char vs e + combining acute)
- User typing "café" on different devices may produce different bytes
- NFC ensures consistent representation

**Trade-offs**:
- ✅ Consistent password hashing across devices
- ✅ Prevents "correct password rejected" confusion
- ✅ Prevents spoofing with visually similar characters
- ❌ Slight processing overhead
- ❌ Must be applied client-side AND server-side

**Implementation**: `String.prototype.normalize('NFC')` in validation middleware

---

## AD-010: Bcrypt 72-Byte Truncation Handling

**Decision**: Reject passwords exceeding 72 bytes UTF-8 encoding; enforce at validation.

**Rationale**:
- bcrypt silently truncates input at 72 bytes
- Long Unicode passwords (e.g., "p@ssw🔒rd🔒🔒🔒...") could be truncated
- Explicit rejection is safer than silent truncation

**Trade-offs**:
- ✅ Prevents silent truncation surprises
- ✅ Clear error message for users
- ✅ Forces password length within secure range
- ❌ Limits maximum password length artificially
- ❌ Requires byte-length check (not character count)

**Implementation**: `Buffer.byteLength(password, 'utf8') > 72` check

---

## AD-011: JWT HS256 for Simple Starter Profile

**Decision**: Use HMAC-SHA256 (HS256) for JWT signing, not RS256.

**Rationale**:
- RS256 requires key management infrastructure (KMS, JWKS endpoint)
- HS256 with 256-bit secret is secure for single-service deployments
- Simple Starter profile prioritizes simplicity over multi-service key rotation

**Trade-offs**:
- ✅ Simpler deployment (single env variable)
- ✅ Faster token generation/verification
- ✅ No external dependencies (KMS, certificates)
- ❌ All services must share same secret
- ❌ Secret rotation requires coordinated deployment
- ❌ No public key verification capability

**Upgrade Path**: Documented migration path to RS256 with JWKS when scaling to multiple services

---

## AD-012: Email Failure Non-Blocking

**Decision**: Password change succeeds even if notification email fails; log separately.

**Rationale**:
- Users should not be locked out due to email service downtime
- Email is notification, not part of security boundary
- Retry logic can handle transient email failures

**Trade-offs**:
- ✅ Better availability (no dependency on email service)
- ✅ Users can change password during email outages
- ❌ User may not be immediately notified of change
- ❌ Requires separate monitoring for email failures

**Implementation**: Fire-and-forget email with try/catch; log failures separately

---

## AD-013: Partial Indexes for Audit Queries

**Decision**: Use partial indexes for low-cardinality fields (status, isActive).

**Rationale**:
- Boolean indexes have terrible selectivity (50% of data on average)
- Partial index only includes documents matching predicate
- Efficient for "show failed attempts" queries

**Trade-offs**:
- ✅ Smaller index size
- ✅ Faster queries for filtered data
- ✅ Reduced write amplification
- ❌ Queries must include filter predicate to use index
- ❌ Slightly more complex index management

**Implementation**: `{ status: 1 }` with `partialFilterExpression: { status: 'failed' }`

---

## Summary

| Decision | Priority | Status |
|----------|----------|--------|
| Session Versioning | Critical | Implemented |
| Bcrypt Calibration | High | Implemented |
| Dual-Key Rate Limiting | Critical | Implemented |
| MongoDB Transactions | Critical | Implemented |
| Password History | High | Implemented |
| Idempotency Keys | Medium | Implemented |
| Timing Safety | High | Implemented |
| Separate Audit Collection | High | Implemented |
| Unicode Normalization | Medium | Implemented |
| Bcrypt Truncation Guard | High | Implemented |
| JWT HS256 | Medium (Simple Starter) | Implemented |
| Email Non-Blocking | Medium | Implemented |
| Partial Indexes | Low | Implemented |
