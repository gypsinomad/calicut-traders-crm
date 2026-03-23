import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface AISettings {
  apiKey: string;
  model: string;
  spendingCapINR: number;
  enabled: boolean;
}

const DEFAULT_SETTINGS: AISettings = {
  apiKey: '',
  model: 'gemini-3-flash-preview',
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
