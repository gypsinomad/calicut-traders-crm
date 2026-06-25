import admin from "firebase-admin";

const INPUT_COST_PER_1M = 0.075;
const OUTPUT_COST_PER_1M = 0.30;
const INR_CONVERSION = 83.5;

export interface AIUsageRecord {
  feature: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  estimatedCostINR: number;
  timestamp: admin.firestore.Timestamp;
  userId: string;
}

export async function trackAICallServer(
  orgId: string,
  userId: string,
  feature: string,
  inputTokens: number,
  outputTokens: number
) {
  try {
    const totalTokens = inputTokens + outputTokens;
    const estimatedCostUSD = (inputTokens / 1000000 * INPUT_COST_PER_1M) + (outputTokens / 1000000 * OUTPUT_COST_PER_1M);
    const estimatedCostINR = estimatedCostUSD * INR_CONVERSION;

    const usageData: AIUsageRecord = {
      feature,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCostUSD,
      estimatedCostINR,
      timestamp: admin.firestore.Timestamp.now(),
      userId: userId
    };

    await admin.firestore()
      .collection("organizations")
      .doc(orgId)
      .collection("ai_usage")
      .add(usageData);
    
    console.log(`[Usage] Logged AI call for org:${orgId} user:${userId} feature:${feature} tokens:${totalTokens}`);
  } catch (error) {
    console.error('[Usage] Error tracking AI usage server-side:', error);
  }
}
