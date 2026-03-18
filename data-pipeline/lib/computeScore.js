/**
 * Deterministic overall score computation from dimensional rubrics.
 * Shared between pipeline (generateDailyScores.js) and tests.
 */
export const WEIGHT_POLICY = 0.4;
export const WEIGHT_HOSTILITY = 0.35;
export const WEIGHT_AMPLIFICATION = 0.25;

export default function computeOverallScore(hostility, policyApproval, mediaAmplification) {
  const policyNormalized = (policyApproval + 1) / 2;
  const inverseHostility = 1 - hostility;
  const raw =
    WEIGHT_POLICY * policyNormalized +
    WEIGHT_HOSTILITY * inverseHostility +
    WEIGHT_AMPLIFICATION * mediaAmplification;
  return parseFloat((raw * 10).toFixed(1));
}
