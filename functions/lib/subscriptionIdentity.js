import crypto from "crypto";

const SUBSCRIPTION_DOC_ID_PREFIX = "sub_";
const SUBSCRIPTION_DOC_ID_HEX_LENGTH = 32;
const SUBSCRIPTION_DOC_ID_REGEX = new RegExp(
  `^${SUBSCRIPTION_DOC_ID_PREFIX}[a-f0-9]{${SUBSCRIPTION_DOC_ID_HEX_LENGTH}}$`
);

export function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function buildSubscriptionDocId(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const digest = crypto.createHash("sha256").update(normalizedEmail).digest("hex");
  return `${SUBSCRIPTION_DOC_ID_PREFIX}${digest.slice(0, SUBSCRIPTION_DOC_ID_HEX_LENGTH)}`;
}

export function createSubscriptionToken(emailOrDocId) {
  const docId =
    typeof emailOrDocId === "string" && SUBSCRIPTION_DOC_ID_REGEX.test(emailOrDocId)
      ? emailOrDocId
      : buildSubscriptionDocId(emailOrDocId);

  if (!docId) return null;
  return `${docId}.${crypto.randomUUID()}`;
}

export function extractSubscriptionDocId(token) {
  if (typeof token !== "string") return null;
  const [candidate] = token.split(".", 1);
  return SUBSCRIPTION_DOC_ID_REGEX.test(candidate) ? candidate : null;
}
