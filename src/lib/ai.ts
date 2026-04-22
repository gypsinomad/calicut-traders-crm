// Removed @google-cloud/vertexai from frontend to prevent build errors
// Vertex AI is now handled server-side in server.ts

export enum Type {
  TYPE_UNSPECIFIED = "TYPE_UNSPECIFIED",
  STRING = "STRING",
  NUMBER = "NUMBER",
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
  ARRAY = "ARRAY",
  OBJECT = "OBJECT"
}

export enum ThinkingLevel {
  UNSPECIFIED = "THINKING_LEVEL_UNSPECIFIED",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH"
}

// Re-export type for compatibility
export interface TradeAIParameters {
  model?: string;
  contents: any;
  config?: any;
  safetySettings?: any;
}

export interface TradeAIResponse {
  text: string;
  candidates?: any[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export type GenerateContentParameters = TradeAIParameters;
export type GenerateContentResponse = TradeAIResponse;

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { trackAICall, getAIUsageSummary } from './aiUsageTracker';
import { getAISettings, AIProvider } from './aiSettings';
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

// Provider instances
let openaiInstance: OpenAI | null = null;
let anthropicInstance: Anthropic | null = null;
let currentProvider: AIProvider | null = null;
let currentApiKey: string | null = null;

async function getAIProvider(orgId: string) {
  const settings = await getAISettings(orgId);
  const provider = settings.provider || 'gemini';
  const providerSettings = settings.providers?.[provider] || { apiKey: '', model: '', enabled: true };
  
  const apiKey = providerSettings.apiKey || (provider === 'gemini' ? process.env.GEMINI_API_KEY : '') || '';
  
  if (currentProvider !== provider || currentApiKey !== apiKey) {
    openaiInstance = null;
    anthropicInstance = null;
    
    if (provider === 'gemini') {
      // Handled server-side
    } else if (provider === 'openai' || provider === 'deepseek' || provider === 'nemotron' || provider === 'mistral') {
      openaiInstance = new OpenAI({ 
        apiKey, 
        baseURL: providerSettings.baseUrl || (provider === 'mistral' ? 'https://api.mistral.ai/v1' : undefined),
        dangerouslyAllowBrowser: true 
      });
    } else if (provider === 'anthropic') {
      anthropicInstance = new Anthropic({ apiKey });
    }
    
    currentProvider = provider;
    currentApiKey = apiKey;
  }

  return { 
    provider, 
    openai: openaiInstance, 
    anthropic: anthropicInstance, 
    settings,
    providerSettings
  };
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
    error.includes('404') ||
    error.includes('api_key_invalid') ||
    error.includes('authentication')
  );
}

export async function generateAIContent(feature: string, params: TradeAIParameters): Promise<TradeAIResponse> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const profileSnap = await getDoc(doc(db, 'users', user.uid));
  const orgId = profileSnap.exists() ? profileSnap.data().organization : 'default';

  const { provider, openai, anthropic, settings, providerSettings } = await getAIProvider(orgId);

  if (!settings.enabled || (providerSettings && !providerSettings.enabled)) {
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
    let responseText = '';
    let inputTokens = 0;
    let outputTokens = 0;

    const model = providerSettings.model || params.model || 'gemini-3-flash-preview';
    
    // Extract prompt and check for image data
    let prompt = '';
    let imageData: { data: string; mimeType: string } | null = null;

    if (typeof params.contents === 'string') {
      prompt = params.contents;
    } else if (Array.isArray(params.contents)) {
      // Handle array of parts or array of contents
      const firstContent = params.contents[0];
      if ((firstContent as any).parts) {
        const parts = (firstContent as any).parts;
        for (const part of parts) {
          if (part.text) prompt += part.text;
          if (part.inlineData) imageData = part.inlineData;
        }
      } else if (typeof firstContent === 'string') {
        prompt = firstContent;
      }
    } else if ((params.contents as any).parts) {
      const parts = (params.contents as any).parts;
      for (const part of parts) {
        if (part.text) prompt += part.text;
        if (part.inlineData) imageData = part.inlineData;
      }
    }

    if (provider === 'gemini') {
      const contents = Array.isArray(params.contents) 
        ? params.contents.map((c: any) => c.parts ? c : { role: 'user', parts: [{ text: typeof c === 'string' ? c : (c as any).text }] })
        : [{ role: 'user', parts: [{ text: typeof params.contents === 'string' ? params.contents : (params.contents as any).text }] }];

      const serverResponse = await fetch('/api/ai/generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          contents,
          config: params.config
        })
      });

      if (!serverResponse.ok) {
        const errorData = await serverResponse.json();
        throw new Error(errorData.error || 'Server-side AI generation failed');
      }

      const response = await serverResponse.json();
      responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      inputTokens = response.usageMetadata?.promptTokenCount || 0;
      outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
    } else if ((provider === 'openai' || provider === 'deepseek' || provider === 'nemotron' || provider === 'mistral') && openai) {
      const messages: any[] = [];
      if (imageData) {
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${imageData.mimeType};base64,${imageData.data}` } }
          ]
        });
      } else {
        messages.push({ role: 'user', content: prompt });
      }

      const completion = await openai.chat.completions.create({
        model,
        messages,
        response_format: params.config?.responseMimeType === 'application/json' ? { type: 'json_object' } : undefined
      });
      responseText = completion.choices[0].message.content || '';
      inputTokens = completion.usage?.prompt_tokens || 0;
      outputTokens = completion.usage?.completion_tokens || 0;
    } else if (provider === 'anthropic' && anthropic) {
      const message = await anthropic.messages.create({
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
      responseText = (message.content[0] as any).text || '';
      inputTokens = message.usage.input_tokens;
      outputTokens = message.usage.output_tokens;
    } else {
      throw new Error(`AI Provider ${provider} not initialized correctly.`);
    }
    
    // Clear error on success
    if (lastAIError) {
      clearAIError();
    }

    trackAICall(feature, inputTokens, outputTokens);
    
    // Return a response object that matches GenerateContentResponse structure
    return {
      text: responseText,
      candidates: [{ content: { parts: [{ text: responseText }] } }],
      usageMetadata: {
        promptTokenCount: inputTokens,
        candidatesTokenCount: outputTokens,
        totalTokenCount: inputTokens + outputTokens
      }
    } as any;
  } catch (error: any) {
    const errorMessage = handleAIError(error);
    lastAIError = errorMessage;
    localStorage.setItem('last_ai_error', errorMessage);
    notifyListeners();
    throw new Error(errorMessage);
  }
}

export function handleAIError(error: any): string {
  console.error('AI Error Details:', error);
  
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
    lowerMessage.includes('exceeded its spending cap') ||
    errorString.includes('spending cap') || 
    errorString.includes('spending limit') ||
    errorString.includes('exceeded its spending cap');

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
