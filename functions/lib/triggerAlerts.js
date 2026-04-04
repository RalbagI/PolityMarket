import { FieldValue } from "firebase-admin/firestore";

/**
 * Handles POST /api/trigger-alerts — checks volatility breaches and
 * dispatches email/webhook alerts to verified subscribers.
 */
export async function handleTriggerAlerts(
  req,
  res,
  { subscriptionsCollection, buildHostedDataUrl, sendEmail, sendWebhook, RESEND_API_KEY, PIPELINE_AUTH_TOKEN, APP_URL }
) {
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
    const volRes = await fetch(buildHostedDataUrl("volatility_data.json", { bustCache: true }), {
      cache: "no-store",
    });
    if (!volRes.ok) throw new Error(`HTTP ${volRes.status}`);
    volatilityData = await volRes.json();
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch volatility data", detail: err.message });
    return;
  }

  const politicians = volatilityData.politicians || {};

  // Fetch Hebrew politician names for email localization
  let hebrewNames = {};
  try {
    const namesRes = await fetch(
      buildHostedDataUrl("politician_names_he.json", { bustCache: true }),
      { cache: "no-store" }
    );
    if (namesRes.ok) hebrewNames = await namesRes.json();
  } catch (err) {
    console.warn("Failed to fetch Hebrew names, falling back to English:", err.message);
  }

  // Get all verified subscriptions
  const subsSnap = await subscriptionsCollection().where("verified", "==", true).get();

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
            `<li><strong>${hebrewNames[b.name] || b.name}</strong> — ${b.direction === "up" ? "↑ עלייה" : "↓ ירידה"} (ציון: ${b.overall_score_latest})</li>`
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
}
