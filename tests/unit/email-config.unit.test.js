import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(
  path.join(__dirname, "../../functions/index.js"),
  "utf-8"
);

describe("Cloud Functions — email sender configuration", () => {
  it("FROM_EMAIL does not hardcode an unverifiable domain", () => {
    // politymarket.web.app and politymarket.firebaseapp.com are Firebase-managed
    // domains where we cannot add DNS records for email verification
    expect(source).not.toMatch(
      /FROM_EMAIL\s*=\s*["'][^"']*@politymarket\.web\.app["']/
    );
    expect(source).not.toMatch(
      /FROM_EMAIL\s*=\s*["'][^"']*@politymarket\.firebaseapp\.com["']/
    );
  });

  it("FROM_EMAIL is configurable via environment variable", () => {
    // Should read from env var so domain can be changed without code deploy
    expect(source).toMatch(/process\.env\.RESEND_FROM_EMAIL/);
  });

  it("FROM_EMAIL fallback uses a known-deliverable sender", () => {
    // The fallback must be a domain that works without DNS verification
    // (Resend sandbox or a pre-verified domain)
    expect(source).toMatch(/onboarding@resend\.dev/);
  });
});

describe("Cloud Functions — rate limiter", () => {
  it("rate limiter checks for valid token before applying cooldown", () => {
    // Authenticated toggle requests (with valid token) must bypass rate limiting.
    // The rate limit code should check token validity before applying the cooldown.
    expect(source).toMatch(/hasValidToken/);
  });

  it("rate limiter only applies to unauthenticated requests", () => {
    // The cooldown should be gated behind !hasValidToken
    expect(source).toMatch(/!hasValidToken/);
  });
});
