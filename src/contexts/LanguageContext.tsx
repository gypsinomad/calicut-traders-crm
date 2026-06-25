import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'ar' | 'ml';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    leads: 'Leads',
    orders: 'Orders',
    shipments: 'Shipments',
    settings: 'Settings',
  },
  ar: {
    dashboard: 'لوحة التحكم',
    leads: 'العملاء المحتملون',
    orders: 'الطلبات',
    shipments: 'الشحنات',
    settings: 'الإعدادات',
  },
  ml: {
    dashboard: 'ഡാഷ്ബോർഡ്',
    leads: 'ലീഡ്സ്',
    orders: 'ഓർഡറുകൾ',
    shipments: 'ഷിപ്പ്മെന്റ്',
    settings: 'ക്രമീകരണങ്ങൾ',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('language') as Language) || 'en';
  });

  const t = (key: string) => translations[language][key] || key;

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export default LanguageContext;
