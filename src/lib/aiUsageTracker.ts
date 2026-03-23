import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  Timestamp,
  deleteDoc,
  doc,
  getDoc
} from 'firebase/firestore';

const INPUT_COST_PER_1M = 0.075;
const OUTPUT_COST_PER_1M = 0.30;
const INR_CONVERSION = 83.5;

export interface AIUsageRecord {
  id?: string;
  feature: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  estimatedCostINR: number;
  timestamp: Timestamp;
  userId: string;
}

export interface AIUsageSummary {
  totalCalls: number;
  totalTokens: number;
  totalCostUSD: number;
  totalCostINR: number;
  byFeature: {
    feature: string;
    totalCalls: number;
    totalTokens: number;
    totalCostUSD: number;
    totalCostINR: number;
  }[];
}

export async function trackAICall(feature: string, inputTokens: number, outputTokens: number) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    // Get orgId from user profile
    const profileSnap = await getDoc(doc(db, 'users', user.uid));
    const orgId = profileSnap.exists() ? profileSnap.data().organization : 'default';

    const totalTokens = inputTokens + outputTokens;
    const estimatedCostUSD = (inputTokens / 1000000 * INPUT_COST_PER_1M) + (outputTokens / 1000000 * OUTPUT_COST_PER_1M);
    const estimatedCostINR = estimatedCostUSD * INR_CONVERSION;

    const usageData: Omit<AIUsageRecord, 'id'> = {
      feature,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCostUSD,
      estimatedCostINR,
      timestamp: Timestamp.now(),
      userId: user.uid
    };

    await addDoc(collection(db, `organizations/${orgId}/ai_usage`), usageData);
  } catch (error) {
    console.error('Error tracking AI usage:', error);
  }
}

export async function getAIUsageSummary(orgId?: string): Promise<AIUsageSummary> {
  const user = auth.currentUser;
  const defaultSummary: AIUsageSummary = {
    totalCalls: 0,
    totalTokens: 0,
    totalCostUSD: 0,
    totalCostINR: 0,
    byFeature: []
  };

  if (!user && !orgId) return defaultSummary;

  try {
    let targetOrgId = orgId;
    if (!targetOrgId && user) {
      const profileSnap = await getDoc(doc(db, 'users', user.uid));
      targetOrgId = profileSnap.exists() ? profileSnap.data().organization : 'default';
    }

    if (!targetOrgId) return defaultSummary;

    const usageSnap = await getDocs(collection(db, `organizations/${targetOrgId}/ai_usage`));
    const records = usageSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AIUsageRecord));

    const featureMap: Record<string, { totalCalls: number; totalTokens: number; totalCostUSD: number; totalCostINR: number }> = {};

    records.forEach(record => {
      if (!featureMap[record.feature]) {
        featureMap[record.feature] = { totalCalls: 0, totalTokens: 0, totalCostUSD: 0, totalCostINR: 0 };
      }
      featureMap[record.feature].totalCalls += 1;
      featureMap[record.feature].totalTokens += record.totalTokens;
      featureMap[record.feature].totalCostUSD += record.estimatedCostUSD;
      featureMap[record.feature].totalCostINR += record.estimatedCostINR;
    });

    const byFeature = Object.entries(featureMap).map(([feature, stats]) => ({
      feature,
      ...stats
    }));

    return {
      totalCalls: records.length,
      totalTokens: records.reduce((sum, r) => sum + r.totalTokens, 0),
      totalCostUSD: records.reduce((sum, r) => sum + r.estimatedCostUSD, 0),
      totalCostINR: records.reduce((sum, r) => sum + r.estimatedCostINR, 0),
      byFeature
    };
  } catch (error) {
    console.error('Error getting AI usage summary:', error);
    return defaultSummary;
  }
}

export async function resetAIUsage(orgId?: string) {
  const user = auth.currentUser;
  if (!user && !orgId) return;

  try {
    let targetOrgId = orgId;
    if (!targetOrgId && user) {
      const profileSnap = await getDoc(doc(db, 'users', user.uid));
      targetOrgId = profileSnap.exists() ? profileSnap.data().organization : 'default';
    }

    if (!targetOrgId) return;

    const usageSnap = await getDocs(collection(db, `organizations/${targetOrgId}/ai_usage`));
    const deletePromises = usageSnap.docs.map(d => deleteDoc(doc(db, `organizations/${targetOrgId}/ai_usage`, d.id)));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error resetting AI usage:', error);
  }
}
