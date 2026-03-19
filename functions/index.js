import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";

initializeApp();

/**
 * Cloud Functions scheduler is intentionally disabled.
 * Production scheduling runs on the self-hosted systemd timer in this repo.
 *
 * This endpoint is retained only as an authenticated status endpoint so
 * existing clients do not break.
 */
export const runPipelineManually = onRequest(
  { region: "europe-west1", memory: "512MiB", timeoutSeconds: 120 },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("POST only");
      return;
    }

    // Auth check — reject if token is set and doesn't match
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
        "Production pipeline moved to self-hosted systemd timer + local Ollama runner. Use scripts/run-daily-pipeline.sh on the primary host.",
      disabledOn: "2026-03-19",
    });
  }
);
