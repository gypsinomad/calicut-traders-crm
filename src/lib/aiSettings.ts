import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'mistral' | 'nemotron';

export interface ProviderSettings {
  apiKey: string;
  model: string;
  enabled: boolean;
  baseUrl?: string; // For OpenAI-compatible APIs like DeepSeek/Nemotron
}

export interface AISettings {
  provider: AIProvider;
  providers: Record<AIProvider, ProviderSettings>;
  spendingCapINR: number;
  enabled: boolean;
  apiKey?: string; // Legacy support
  model?: string; // Legacy support
}

const DEFAULT_SETTINGS: AISettings = {
  provider: 'gemini',
  providers: {
    gemini: { apiKey: '', model: 'gemini-3-flash-preview', enabled: true },
    openai: { apiKey: '', model: 'gpt-4o-mini', enabled: false },
    anthropic: { apiKey: '', model: 'claude-3-5-sonnet-20240620', enabled: false },
    deepseek: { apiKey: '', model: 'deepseek-chat', enabled: false, baseUrl: 'https://api.deepseek.com' },
    mistral: { apiKey: '', model: 'mistral-large-latest', enabled: false },
    nemotron: { apiKey: '', model: 'nvidia/nemotron-4-340b-instruct', enabled: false, baseUrl: 'https://integrate.api.nvidia.com/v1' }
  },
  spendingCapINR: 1000,
  enabled: true
};

const SETTINGS_KEY = 'crm_ai_settings';

export async function getAISettings(orgId: string): Promise<AISettings> {
  // Try local storage first for speed
  const local = localStorage.getItem(`${SETTINGS_KEY}_${orgId}`);
  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {
      console.error('Error parsing local AI settings:', e);
    }
  }

  // Fallback to Firestore
  try {
    const docRef = doc(db, 'organizations', orgId, 'settings', 'ai');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as AISettings;
      localStorage.setItem(`${SETTINGS_KEY}_${orgId}`, JSON.stringify(data));
      return data;
    }
  } catch (error) {
    console.error('Error fetching AI settings from Firestore:', error);
  }

  return DEFAULT_SETTINGS;
}

export async function saveAISettings(orgId: string, settings: AISettings): Promise<void> {
  // Save to local storage
  localStorage.setItem(`${SETTINGS_KEY}_${orgId}`, JSON.stringify(settings));

  // Save to Firestore
  try {
    const docRef = doc(db, 'organizations', orgId, 'settings', 'ai');
    await setDoc(docRef, settings, { merge: true });
  } catch (error) {
    console.error('Error saving AI settings to Firestore:', error);
    throw error;
  }
}
