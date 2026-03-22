import { GoogleGenAI } from "@google/genai";

export type Language = 'en' | 'ar' | 'sw' | 'ml';

const CACHE_KEY = 'crm_translations_cache';

interface TranslationCache {
  [lang: string]: {
    [text: string]: string;
  };
}

class TranslationService {
  private cache: TranslationCache = {};

  constructor() {
    const savedCache = localStorage.getItem(CACHE_KEY);
    if (savedCache) {
      try {
        this.cache = JSON.parse(savedCache);
      } catch (e) {
        this.cache = {};
      }
    }
  }

  private saveCache() {
    localStorage.setItem(CACHE_KEY, JSON.stringify(this.cache));
  }

  async translate(text: string, targetLang: Language): Promise<string> {
    if (targetLang === 'en') return text;
    
    if (this.cache[targetLang]?.[text]) {
      return this.cache[targetLang][text];
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const model = "gemini-3-flash-preview";
      
      const prompt = `Translate the following text to ${this.getLanguageName(targetLang)}. 
      Return ONLY the translated text, no explanations or extra characters.
      Text: "${text}"`;

      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const translatedText = response.text?.trim() || text;

      if (!this.cache[targetLang]) this.cache[targetLang] = {};
      this.cache[targetLang][text] = translatedText;
      this.saveCache();

      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }

  private getLanguageName(lang: Language): string {
    switch (lang) {
      case 'ar': return 'Arabic';
      case 'sw': return 'Swahili';
      case 'ml': return 'Malayalam';
      default: return 'English';
    }
  }
}

export const translationService = new TranslationService();
