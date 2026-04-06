---
name: security
description: >
  Security review and audit for PolityMarket. Use for auth, secrets, Cloud Functions,
  Firestore rules, App Check, XSS prevention, and OWASP Web Top 10.
---

# PolityMarket Security Skill

Expert security reviewer and auditor for React/Firebase web applications
and DevSecOps practices in the PolityMarket project.

## When to Activate

- Implementing authentication or authorization
- Creating or modifying Cloud Functions or Firestore rules
- Handling user input or sensitive data
- Working with secrets or credentials
- Security audits
- Integrating third-party APIs
- Reviewing for XSS, CSRF, or injection vulnerabilities

## App Check Enforcement (MANDATORY)

Every Cloud Function MUST use `requireAppCheckV1`:

```typescript
import { requireAppCheckV1 } from './security/app-check';

export const myFunction = functions.https.onCall(async (data, context) => {
  requireAppCheckV1(context); // MUST be first line
  // Function logic...
});
```

## Backward Compatibility (BWC) Validation

When reviewing schema or API changes, verify:

- Firestore rules: No fields removed from `hasOnly` arrays
- Zod schemas: No fields removed, no optional->required changes
- Cloud Functions: No existing signature modifications (use V2)
- New collections: Must include `schemaVersion` in `hasOnly`

Reference: `.agent/RULES.md` BWC: Zero-Breaking-Change Policy

## Secrets Management

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
const SubscriptionSchema = z.object({
  email: z.string().email().max(255),
  webhookUrl: z.string().url().max(2048).optional(),
});

function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').trim().substring(0, MAX_LENGTH);
}
```

## XSS Prevention (React)

React escapes JSX by default, but these patterns are dangerous:

```tsx
// DANGEROUS - direct HTML injection
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// SAFE - React auto-escapes
<div>{userInput}</div>

// DANGEROUS - URL injection
<a href={userInput}>Link</a>  // javascript: protocol possible

// SAFE - validate protocol
const safeUrl = /^https?:\/\//.test(url) ? url : '#';
<a href={safeUrl}>Link</a>
```

Rules:
- Never use `dangerouslySetInnerHTML` with user-controlled content
- Validate URL protocols before rendering `href` or `src` attributes
- Sanitize any content rendered outside React's JSX escaping

## CORS and CSP (Cloud Functions)

```typescript
// Cloud Functions CORS
const corsOptions = {
  origin: ['https://politymarket.web.app'],
  methods: ['GET', 'POST'],
};

// CSP headers in firebase.json hosting config
// Content-Security-Policy: default-src 'self'; script-src 'self'
```

## Webhook SSRF Prevention

User-supplied webhook URLs must be validated before storage:

```typescript
function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1') return false;
    if (hostname.endsWith('.internal')) return false;
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/.test(hostname)) return false;
    return true;
  } catch { return false; }
}
```

## Firestore Security Rules

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

## Vulnerability Patterns

| Pattern | Risk | Mitigation |
|---------|------|------------|
| Missing App Check | Unauthorized API access | Add `requireAppCheckV1` |
| Open Firestore rules | Data exposure | Explicit allow rules with `hasOnly` |
| `dangerouslySetInnerHTML` | XSS attack | Never use with user content |
| `localStorage` for tokens | XSS token theft | Use httpOnly cookies or in-memory |
| Missing schema validation | Field injection | Use `keys().hasOnly()` |
| Unvalidated webhook URLs | SSRF | Validate protocol, reject private IPs |
| Missing CORS | Cross-origin abuse | Restrict to `politymarket.web.app` |
| Hardcoded secrets | Credential exposure | Use Cloud Secret Manager |

## OWASP Web Top 10

| Category | Check |
|----------|-------|
| A01: Broken Access Control | Firestore rules + App Check |
| A02: Cryptographic Failures | HTTPS only, no secrets in client |
| A03: Injection | Zod validation, React JSX escaping |
| A04: Insecure Design | BWC policy, least privilege |
| A05: Security Misconfiguration | CSP headers, CORS, no debug in prod |
| A06: Vulnerable Components | `npm audit --omit=dev --audit-level=high` |
| A07: Auth Failures | Firebase Auth, session management |
| A08: Data Integrity | Zod schemas, Firestore rules |
| A09: Logging Failures | Cloud Functions logs via GCP |
| A10: SSRF | Webhook URL validation |

## Security Checklist

### Cloud Functions

- [ ] `requireAppCheckV1(context)` first line in every callable
- [ ] Secrets via Cloud Secret Manager (not `functions.config()`)
- [ ] Input validation with Zod
- [ ] String sanitization before Firestore writes
- [ ] Rate limiting on expensive operations
- [ ] Error messages don't leak internals
- [ ] CORS restricted to production domain

### Firestore Rules

- [ ] All collections have explicit rules
- [ ] `keys().hasOnly([...])` on create/update
- [ ] Existence checks before `get()` calls
- [ ] User can only access own data (unless admin)

### Web Application

- [ ] No `dangerouslySetInnerHTML` with user content
- [ ] URL protocols validated before rendering
- [ ] No hardcoded secrets in client-side code
- [ ] CSP headers configured
- [ ] No sensitive data in localStorage
- [ ] HTTPS only

### Authentication

- [ ] Session timeout implemented
- [ ] Subscription updates require token (not just email)

## Security Testing Commands

```bash
npm audit --omit=dev --audit-level=high
gitleaks detect --source . --config .gitleaks.toml
npx eslint src/ --rule '{"no-eval": "error"}'
firebase emulators:exec "npm test" --only firestore
```

## Audit Response Approach

1. Check App Check (all callables have `requireAppCheckV1`)
2. Review Firestore Rules (schema validation, existence checks)
3. Audit Secrets (no hardcoded, proper Secret Manager)
4. Validate Input (Zod schemas, sanitization before writes)
5. Review XSS vectors (`dangerouslySetInnerHTML`, URL injection)
6. Check CORS/CSP configuration
7. Verify webhook URL validation (SSRF prevention)
8. Review npm dependencies (`npm audit`)
