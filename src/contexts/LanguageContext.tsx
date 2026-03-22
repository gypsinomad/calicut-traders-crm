import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translationService, Language } from '../services/translationService';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  translate: (text: string) => Promise<string>;
  t: (text: string) => string; // Synchronous translation using cache
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('crm_language') as Language) || 'en';
  });

  const [translations, setTranslations] = useState<Record<string, string>>({});

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('crm_language', lang);
    // Force reload or update context
    window.location.reload(); // Simplest way to re-trigger all translations
  };

  const translate = async (text: string) => {
    return await translationService.translate(text, language);
  };

  const t = (text: string) => {
    // This is a simplified version that relies on the cache populated by translate()
    // or pre-defined translations. For a real app, we'd use a more robust i18n library.
    const cache = JSON.parse(localStorage.getItem('crm_translations_cache') || '{}');
    return cache[language]?.[text] || text;
  };

  const isRTL = language === 'ar';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translate, t, isRTL }}>
      <div dir={isRTL ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
