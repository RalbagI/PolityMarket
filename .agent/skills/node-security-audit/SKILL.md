---
name: node-security-audit
description: Security auditing for Node.js dependencies and package configurations.
---

# Node Security Audit Skill

Automates checks for `functions/package.json` vulnerabilities and enforces security overrides.

## Workflows

### 1. Dependency Audit

- Check `functions/package.json` against known vulnerabilities.
- Consult `security-overrides.md` (if present) for allowed exceptions.
- **Tools**: `npm audit` (analysis only).

### 2. Lockfile Analysis

- Ensure `package-lock.json` is present and up to date.
- Verify no packages are resolving to http:// sources (must be https).

### 3. Script Security

- Review `scripts` in `package.json` for dangerous commands.
- Ensure no sensitive environment variables are hardcoded in scripts.

## Tipi Rules

1. **Strict Versioning**: Use specific versions or caret `^` conservatively. Avoid latest `*`.
2. **Dev Dependencies**: Ensure build tools/test runners are in `devDependencies`.
3. **Overrides**: If a vulnerability is ignored, it MUST be documented in `security-overrides.md` with a justification
   and expiry.

## Usage

```bash
# Check for vulnerabilities
cd functions
npm audit

# Validate specific package
npm view <package> version
```
