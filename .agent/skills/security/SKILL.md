---
name: security
description: >
  Security review and audit for Tipi. Use for auth, secrets, Cloud Functions,
  Firestore rules, App Check, CSAE compliance, and OWASP Mobile Top 10.
model: opus
updated_at: "2026-02-24"
review_cycle_days: 180
---

# Tipi Security Skill

Expert security reviewer and auditor for Flutter/Firebase, CSAE compliance,
and DevSecOps practices in the Tipi application.

## When to Activate

- Implementing authentication or authorization
- Creating or modifying Cloud Functions or Firestore rules
- Handling user input, file uploads, or sensitive data
- Working with secrets or credentials
- Security audits, CSAE/GDPR compliance verification
- Integrating third-party APIs

## CSAE Compliance

Reference: `ai_docs/ops/RUNBOOK_CSAE.md`

- Age verification at signup (birthdate collection)
- Content moderation for user-generated content
- Reporting mechanisms for inappropriate content
- Data retention policies for minors

## App Check Enforcement (MANDATORY)

Every Cloud Function MUST use `requireAppCheckV1`:

```typescript
import { requireAppCheckV1 } from './security/app-check';

export const myFunction = functions.https.onCall(async (data, context) => {
  requireAppCheckV1(context); // MUST be first line
  // Function logic...
});
```

Reference: `ai_docs/architecture/security-architecture.yaml`

## Backward Compatibility (BWC) Validation

When reviewing schema or API changes, verify:

- Firestore rules: No fields removed from `hasOnly` arrays
- Zod schemas: No fields removed, no optional->required changes
- Cloud Functions: No existing signature modifications (use V2)
- New collections: Must include `schemaVersion` in `hasOnly`
- Automated enforcement: `scripts/lint-firestore-rules.sh`

Reference: `.agent/RULES.md` BWC: Zero-Breaking-Change Policy

## Secrets Management

Reference: `docs/compliance/cloud-functions-secrets.md`

**NEVER use**: `functions.config()` (deprecated), hardcoded secrets, module-level constants.

**ALWAYS use**: Cloud Secret Manager with `runWith({ secrets: [...] })` and accessor functions:

```typescript
function getHmacSecret(): string {
  const secret = process.env.HMAC_SECRET;
  if (!secret) throw new Error('HMAC_SECRET not configured');
  return secret;
}

export const signedFunction = functions
  .runWith({ secrets: ['HMAC_SECRET'] })
  .https.onCall(async (data, context) => {
    const secret = getHmacSecret();
  });
```

## Input Validation (Cloud Functions)

Validate all inputs with Zod; sanitize strings before Firestore writes:

```typescript
const CreateRoomSchema = z.object({
  name: z.string().min(1).max(100),
  center: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  radius: z.number().positive().max(10000),
});

function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').trim().substring(0, MAX_LENGTH);
}
```

## Firestore Security Rules

Reference: `ai_docs/implementation/firestore-rules-enhanced.md`

### Schema Validation (MANDATORY)

```javascript
// CORRECT - Prevent field injection
allow create: if request.auth != null
  && request.resource.data.keys().hasOnly(['name', 'email', 'createdAt'])
  && request.resource.data.name is string;

// WRONG - Allows arbitrary fields
allow create: if request.auth != null;
```

### Existence Checks

```javascript
// CORRECT - Check before accessing
allow read: if exists(/databases/$(database)/documents/users/$(request.auth.uid))
  && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
```

### Write-Time Enforcement (TOCTOU Prevention)

Client-side validation is for UX only. Use server-side session tokens:

```javascript
allow write: if exists(
  /databases/$(database)/documents/rooms/$(roomId)/validSessions/$(request.auth.uid)
);
```

## Authentication & Authorization

- Client (Flutter) validates for user feedback only
- Server (Cloud Functions) validates for security
- Firestore Rules enforce at write time
- Session tokens for complex validations (geofence, etc.)

## Sensitive Data Protection (Flutter)

- Auth tokens: `flutter_secure_storage` (NOT SharedPreferences)
- Sensitive media: AES-GCM-256 encryption before upload
- Never log PII or send to analytics
- Network requests: HTTPS only

## Vulnerability Patterns

| Pattern | Risk | Mitigation |
|---------|------|------------|
| Missing App Check | Unauthorized API access | Add `requireAppCheckV1` |
| Open Firestore rules | Data exposure | Explicit allow rules |
| Plaintext SharedPreferences | Local data theft | Use FlutterSecureStorage |
| Missing schema validation | Field injection | Use `keys().hasOnly()` |
| Client-side geofence check | Bypass location | Server-side session tokens |

## OWASP Mobile Top 10

| Category | Check |
|----------|-------|
| M1: Improper Platform Usage | App Check, proper permissions |
| M2: Insecure Data Storage | Use flutter_secure_storage |
| M3: Insecure Communication | HTTPS only, cert pinning |
| M4: Insecure Authentication | Firebase Auth + App Check |
| M5: Insufficient Cryptography | Use AES-GCM-256 |
| M6: Insecure Authorization | Firestore Rules + CF validation |
| M7: Client Code Quality | dart analyze, no secrets |
| M8: Code Tampering | App Check attestation |
| M9: Reverse Engineering | ProGuard enabled |
| M10: Extraneous Functionality | Remove debug endpoints |

## Security Checklist

### Cloud Functions

- [ ] `requireAppCheckV1(context)` first line in every callable
- [ ] Secrets via Cloud Secret Manager (not `functions.config()`)
- [ ] Input validation with Zod
- [ ] String sanitization before Firestore writes
- [ ] Rate limiting on expensive operations
- [ ] Error messages don't leak internals

### Firestore Rules

- [ ] All collections have explicit rules
- [ ] `keys().hasOnly([...])` on create/update
- [ ] Existence checks before `get()` calls
- [ ] User can only access own data (unless admin)

### Mobile App

- [ ] No hardcoded secrets in Dart code
- [ ] Sensitive data in FlutterSecureStorage
- [ ] HTTPS only, no debug endpoints in production

### Authentication

- [ ] Session timeout implemented
- [ ] Account deletion fully clears user data
- [ ] Age verification at signup (CSAE)

## Security Testing Commands

```bash
./scripts/check-compliance.sh
gitleaks detect --source . --config .gitleaks.toml
osv-scanner scan --lockfile pubspec.lock
firebase emulators:exec "npm test" --only firestore
```

## Audit Response Approach

1. Check App Check (all callables have `requireAppCheckV1`)
2. Review Firestore Rules (schema validation, existence checks)
3. Audit Secrets (no hardcoded, proper Secret Manager)
4. Validate Input (sanitization before Firestore writes)
5. Check Storage (FlutterSecureStorage for sensitive data)
6. Review Permissions (least privilege)
7. CSAE Compliance (age verification, content moderation)

## Related Documentation

- `docs/compliance/` - Compliance documentation (read-only)
- `ai_docs/ops/RUNBOOK_CSAE.md` - CSAE procedures
- `ai_docs/architecture/security-architecture.yaml` - Security architecture
- `SECURITY.md` - Security policy
