import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

const app = initializeApp();
const db = getFirestore(app);

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const PIPELINE_AUTH_TOKEN = defineSecret("PIPELINE_AUTH_TOKEN");

const COLLECTION = "alertSubscriptions";
const APP_URL = "https://politymarket.web.app";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "PolityMarket <onboarding@resend.dev>";

// ── Helper: validate email format ─────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Helper: validate webhook URL (SSRF prevention) ────────────────────
function isValidWebhookUrl(url) {
  if (!url) return true; // null/undefined is fine (optional field)
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    // Block internal/private hosts
    if (
      host === "localhost" ||
      host === "metadata.google.internal" ||
      host.endsWith(".internal") ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      host === "0.0.0.0"
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ── Helper: send email via Resend ─────────────────────────────────────
async function sendEmail(apiKey, { to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
  return res.json();
}

// ── Helper: send webhook ──────────────────────────────────────────────
async function sendWebhook(url, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`Webhook delivery failed (${res.status}): ${url}`);
      return false;
    }
    return true;
  } catch {
    // Fire-and-forget: log but don't fail
    console.warn(`Webhook delivery failed: ${url}`);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

// ── CORS helper ───────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://politymarket.web.app",
  "https://politymarket.firebaseapp.com",
];

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  } else {
    res.set("Access-Control-Allow-Origin", ALLOWED_ORIGINS[0]);
  }
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

/**
 * Legacy pipeline endpoint — retained for backward compatibility.
 */
export const runPipelineManually = onRequest(
  { region: "europe-west1", memory: "512MiB", timeoutSeconds: 120 },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("POST only");
      return;
    }

    const authToken = process.env.PIPELINE_AUTH_TOKEN || "";
    if (authToken) {
      const provided = req.headers.authorization?.replace("Bearer ", "");
      if (provided !== authToken) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
    }

    res.status(410).json({
      error: "dailyPipeline disabled",
      message:
        "Production pipeline moved to self-hosted systemd timer + Claude CLI. Use scripts/run-daily-pipeline.sh on the primary host.",
      disabledOn: "2026-03-19",
    });
  }
);

/**
 * Alert subscription API — handles subscribe, verify, unsubscribe, and trigger-alerts.
 */
export const api = onRequest(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [RESEND_API_KEY, PIPELINE_AUTH_TOKEN],
  },
  async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const urlPath = req.path.replace(/^\/api/, "") || "/";

    // ── POST /api/subscribe ───────────────────────────────────────────
    if (urlPath === "/subscribe" && req.method === "POST") {
      const { email, politicianIds, webhookUrl, preferences } = req.body || {};

      if (!email || !isValidEmail(email)) {
        res.status(400).json({ error: "Valid email required" });
        return;
      }

      if (!Array.isArray(politicianIds) || politicianIds.length === 0) {
        res.status(400).json({ error: "At least one politician ID required" });
        return;
      }

      if (politicianIds.length > 200 || !politicianIds.every((id) => typeof id === "string" && id.length < 100)) {
        res.status(400).json({ error: "Invalid politician IDs" });
        return;
      }

      if (webhookUrl && !isValidWebhookUrl(webhookUrl)) {
        res.status(400).json({ error: "Webhook URL must be HTTPS and not target internal networks" });
        return;
      }

      // Check for existing subscription (also used for rate limiting)
      const existing = await db
        .collection(COLLECTION)
        .where("email", "==", email)
        .limit(1)
        .get();

      if (!existing.empty) {
        const existingData = existing.docs[0].data();
        const hasValidToken = req.body.token && req.body.token === existingData.token;

        // Rate limit: 1-minute cooldown — only for unauthenticated requests (no token).
        // Authenticated toggle updates (with valid token) bypass the cooldown.
        if (!hasValidToken) {
          const updatedAt = existingData.updatedAt?.toDate?.();
          if (updatedAt && Date.now() - updatedAt.getTime() < 60_000) {
            res.status(429).json({ error: "Too many requests. Try again in a minute." });
            return;
          }
        }
      }

      if (!existing.empty) {
        // Existing subscription — require token for updates
        const doc = existing.docs[0];
        const { token: requestToken } = req.body;
        if (!requestToken || requestToken !== doc.data().token) {
          res.status(403).json({ error: "Token required to update existing subscription" });
          return;
        }
        await doc.ref.update({
          politicianIds,
          webhookUrl: webhookUrl || null,
          preferences: preferences || { scoreThresholdSigma: 2, notifyOn: "all" },
          updatedAt: FieldValue.serverTimestamp(),
        });
        res.json({ ok: true, token: doc.data().token, updated: true });
        return;
      }

      // Create new subscription
      const token = crypto.randomUUID();
      const docData = {
        email,
        webhookUrl: webhookUrl || null,
        politicianIds,
        token,
        verified: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastAlertedAt: null,
        lastAlertedBreaches: [],
        preferences: preferences || { scoreThresholdSigma: 2, notifyOn: "all" },
      };

      await db.collection(COLLECTION).add(docData);

      // Send verification email
      const verifyUrl = `${APP_URL}/api/verify?token=${token}`;
      try {
        await sendEmail(RESEND_API_KEY.value(), {
          to: email,
          subject: "PolityMarket — אימות הרשמה להתראות",
          html: `
            <div dir="rtl" style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
              <h2>אימות הרשמה להתראות PolityMarket</h2>
              <p>לחץ על הכפתור כדי לאמת את כתובת האימייל שלך:</p>
              <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #f59e0b; color: #000; text-decoration: none; border-radius: 8px; font-weight: bold;">
                אמת את האימייל שלי
              </a>
              <p style="color: #666; font-size: 12px; margin-top: 24px;">
                אם לא נרשמת להתראות, ניתן להתעלם מהודעה זו.
              </p>
            </div>
          `,
        });
      } catch (err) {
        console.error("Verification email failed:", err);
      }

      res.json({ ok: true, token, updated: false });
      return;
    }

    // ── GET /api/verify ───────────────────────────────────────────────
    if (urlPath === "/verify" && req.method === "GET") {
      const token = req.query.token;
      if (!token) {
        res.status(400).send("Token required");
        return;
      }

      const snap = await db
        .collection(COLLECTION)
        .where("token", "==", token)
        .limit(1)
        .get();

      if (snap.empty) {
        res.status(404).send("Subscription not found");
        return;
      }

      await snap.docs[0].ref.update({
        verified: true,
        updatedAt: FieldValue.serverTimestamp(),
      });

      res.redirect(`${APP_URL}?verified=true`);
      return;
    }

    // ── GET /api/unsubscribe (email link) ─────────────────────────────
    if (urlPath === "/unsubscribe" && req.method === "GET") {
      const token = req.query.token;
      if (!token) {
        res.status(400).send("Token required");
        return;
      }

      const snap = await db
        .collection(COLLECTION)
        .where("token", "==", token)
        .limit(1)
        .get();

      // Idempotent unsubscribe for email links: do not leak existence.
      if (!snap.empty) {
        await snap.docs[0].ref.delete();
      }

      res.redirect(`${APP_URL}?unsubscribed=true`);
      return;
    }

    // ── POST /api/unsubscribe ─────────────────────────────────────────
    if (urlPath === "/unsubscribe" && req.method === "POST") {
      const { token } = req.body || {};
      if (!token) {
        res.status(400).json({ error: "Token required" });
        return;
      }

      const snap = await db
        .collection(COLLECTION)
        .where("token", "==", token)
        .limit(1)
        .get();

      if (snap.empty) {
        res.status(404).json({ error: "Subscription not found" });
        return;
      }

      await snap.docs[0].ref.delete();
      res.json({ ok: true });
      return;
    }

    // ── POST /api/trigger-alerts ──────────────────────────────────────
    if (urlPath === "/trigger-alerts" && req.method === "POST") {
      // Auth check
      const pipelineToken = PIPELINE_AUTH_TOKEN.value();
      if (pipelineToken) {
        const provided = req.headers.authorization?.replace("Bearer ", "");
        if (provided !== pipelineToken) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
      }

      // Fetch latest volatility data
      let volatilityData;
      try {
        const volRes = await fetch(`${APP_URL}/data/volatility_data.json`);
        if (!volRes.ok) throw new Error(`HTTP ${volRes.status}`);
        volatilityData = await volRes.json();
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch volatility data", detail: err.message });
        return;
      }

      const politicians = volatilityData.politicians || {};

      // Get all verified subscriptions
      const subsSnap = await db
        .collection(COLLECTION)
        .where("verified", "==", true)
        .get();

      let emailsSent = 0;
      let webhooksSent = 0;

      for (const doc of subsSnap.docs) {
        const sub = doc.data();
        const watchedIds = sub.politicianIds || [];
        const lastBreaches = sub.lastAlertedBreaches || [];
        let emailDelivered = false;
        let webhookDelivered = false;

        // Find new breaches for this subscriber
        const newBreaches = [];
        for (const pid of watchedIds) {
          const pol = politicians[pid];
          if (pol?.is_volatile && !lastBreaches.includes(pid)) {
            newBreaches.push({ politician_id: pid, ...pol });
          }
        }

        if (newBreaches.length === 0) continue;

        // Current full breach set for dedup tracking
        const currentBreachIds = watchedIds.filter((pid) => politicians[pid]?.is_volatile);

        // Send email
        if (sub.email) {
          const breachList = newBreaches
            .map(
              (b) =>
                `<li><strong>${b.name}</strong> — σ${Math.abs(b.overall_score_sigma ?? 0).toFixed(1)} ${b.direction === "up" ? "↑" : "↓"} (ציון: ${b.overall_score_latest})</li>`
            )
            .join("");

          const unsubscribeUrl = `${APP_URL}/api/unsubscribe?token=${sub.token}`;

          try {
            await sendEmail(RESEND_API_KEY.value(), {
              to: sub.email,
              subject: `[PolityMarket] התראת תנודתיות — ${newBreaches.length} פוליטיקאים`,
              html: `
                <div dir="rtl" style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #f59e0b;">התראת תנודתיות</h2>
                  <p>זוהו שינויים חריגים בציונים של הפוליטיקאים הבאים:</p>
                  <ul>${breachList}</ul>
                  <a href="${APP_URL}" style="display: inline-block; padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
                    צפה בדשבורד
                  </a>
                  <p style="color: #999; font-size: 11px; margin-top: 32px;">
                    <a href="${unsubscribeUrl}" style="color: #999;">ביטול הרשמה</a>
                  </p>
                </div>
              `,
            });
            emailsSent++;
            emailDelivered = true;
          } catch (err) {
            console.error(`Email failed for ${sub.email}:`, err);
          }
        }

        // Send webhook
        if (sub.webhookUrl) {
          webhookDelivered = await sendWebhook(sub.webhookUrl, {
            event: "volatility_breach",
            timestamp: new Date().toISOString(),
            breaches: newBreaches,
          });
          if (webhookDelivered) {
            webhooksSent++;
          }
        }

        // Update dedup only when at least one delivery channel succeeded.
        if (emailDelivered || webhookDelivered) {
          await doc.ref.update({
            lastAlertedAt: FieldValue.serverTimestamp(),
            lastAlertedBreaches: currentBreachIds,
          });
        } else {
          console.warn(`No successful alert delivery for subscription ${doc.id}`);
        }
      }

      res.json({
        ok: true,
        subscribersChecked: subsSnap.size,
        emailsSent,
        webhooksSent,
      });
      return;
    }

    res.status(404).json({ error: "Not found" });
  }
);
