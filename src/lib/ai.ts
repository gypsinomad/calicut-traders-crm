import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import { trackAICall, getAIUsageSummary } from './aiUsageTracker';
import { getAISettings } from './aiSettings';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

// Global state for AI status
let lastAIError: string | null = localStorage.getItem('last_ai_error');
const statusListeners: ((error: string | null) => void)[] = [];

export function clearAIError() {
  lastAIError = null;
  localStorage.removeItem('last_ai_error');
  notifyListeners();
}

export function getLastAIError() {
  return lastAIError;
}

export function subscribeToAIStatus(callback: (error: string | null) => void) {
  statusListeners.push(callback);
  return () => {
    const index = statusListeners.indexOf(callback);
    if (index > -1) statusListeners.splice(index, 1);
  };
}

function notifyListeners() {
  statusListeners.forEach(cb => cb(lastAIError));
}

let aiInstance: GoogleGenAI | null = null;
let currentApiKey: string | null = null;

async function getAIInstance(orgId: string) {
  const settings = await getAISettings(orgId);
  const apiKey = settings.apiKey || process.env.GEMINI_API_KEY || '';
  
  if (!aiInstance || currentApiKey !== apiKey) {
    aiInstance = new GoogleGenAI({ apiKey });
    currentApiKey = apiKey;
  }
  return { ai: aiInstance, settings };
}

export function isAIAvailable() {
  if (!lastAIError) return true;
  
  const error = lastAIError.toLowerCase();
  // If it's a quota, spending cap, or model not found error, AI is considered unavailable
  return !(
    error.includes('quota') || 
    error.includes('spending limit') || 
    error.includes('spending cap') || 
    error.includes('not available') ||
    error.includes('not supported') ||
    error.includes('429') ||
    error.includes('404')
  );
}

export async function generateAIContent(feature: string, params: GenerateContentParameters): Promise<GenerateContentResponse> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const profileSnap = await getDoc(doc(db, 'users', user.uid));
  const orgId = profileSnap.exists() ? profileSnap.data().organization : 'default';

  const { ai, settings } = await getAIInstance(orgId);

  if (!settings.enabled) {
    throw new Error('AI features are currently disabled in settings.');
  }

  // Check spending cap
  const usage = await getAIUsageSummary(orgId);
  if (usage.totalCostINR >= settings.spendingCapINR) {
    const error = `Monthly AI spending cap of ₹${settings.spendingCapINR} reached. Current usage: ₹${usage.totalCostINR.toFixed(2)}.`;
    lastAIError = error;
    notifyListeners();
    throw new Error(error);
  }

  try {
    const response = await ai.models.generateContent({
      ...params,
      model: settings.model || params.model || 'gemini-3-flash-preview'
    });
    
    // Clear error on success
    if (lastAIError) {
      clearAIError();
    }

    if (response.usageMetadata) {
      const inputTokens = response.usageMetadata.promptTokenCount || 0;
      const outputTokens = response.usageMetadata.candidatesTokenCount || 0;
      trackAICall(feature, inputTokens, outputTokens);
    }
    
    return response;
  } catch (error: any) {
    const errorMessage = handleAIError(error);
    lastAIError = errorMessage;
    localStorage.setItem('last_ai_error', errorMessage);
    notifyListeners();
    throw error;
  }
}

export function handleAIError(error: any): string {
  console.error('AI Error:', error);
  
  // Extract message from various possible error structures
  let message = '';
  if (typeof error === 'string') {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (error?.error?.message) {
    message = error.error.message;
  } else if (error?.message) {
    message = error.message;
  }
  
  const lowerMessage = message.toLowerCase();
  const errorString = JSON.stringify(error).toLowerCase();
  
  const isQuotaError = 
    error?.status === 429 || 
    error?.error?.code === 429 ||
    error?.error?.status === 'RESOURCE_EXHAUSTED' ||
    lowerMessage.includes('resource_exhausted') ||
    lowerMessage.includes('429') ||
    lowerMessage.includes('quota') ||
    errorString.includes('resource_exhausted') ||
    errorString.includes('429') ||
    errorString.includes('quota');

  const isModelNotFoundError = 
    error?.status === 404 || 
    error?.error?.code === 404 ||
    lowerMessage.includes('not found') ||
    lowerMessage.includes('not supported') ||
    errorString.includes('404');

  const isSpendingCapError = 
    lowerMessage.includes('spending cap') || 
    lowerMessage.includes('spending limit') ||
    errorString.includes('spending cap') || 
    errorString.includes('spending limit');

  if (isSpendingCapError) {
    return 'The AI service has reached its spending limit. The application has automatically switched to Smart Mode (rule-based logic). Please check your billing settings in the Google AI Studio or Google Cloud Console.';
  }

  if (isQuotaError) {
    return 'The AI is currently at its capacity limit (Quota Exceeded). The application has automatically switched to Smart Mode. Please try again in a few minutes or check your quota limits.';
  }

  if (isModelNotFoundError) {
    return 'The selected AI model is not available or not supported. Please check your AI configuration settings.';
  }

  return 'An error occurred while generating AI insights. The application will continue in Smart Mode.';
}
