import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserSettings } from '../types';

interface I18nContextType {
  t: (key: string, vars?: Record<string, string | number>) => string;
  lang: 'ms';
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [translations, setTranslations] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const response = await fetch('./locales/ms.json');
        if (!response.ok) {
          throw new Error(`Language file for 'ms' not found`);
        }
        const data = await response.json();
        setTranslations(data);
      } catch (error) {
        console.error('Failed to load Malay translations:', error);
      }
    };

    fetchTranslations();
  }, []);
  
  // Handle document language and directionality
  useEffect(() => {
    document.documentElement.lang = 'ms';
    document.documentElement.dir = 'ltr';
  }, []);


  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    // Return key if translations haven't loaded yet
    if (Object.keys(translations).length === 0) {
        return key;
    }

    let translation = translations[key] || key;
    if (vars) {
      for (const [varKey, varValue] of Object.entries(vars)) {
        translation = translation.replace(`{${varKey}}`, String(varValue));
      }
    }
    return translation;
  }, [translations]);

  return (
    <I18nContext.Provider value={{ t, lang: 'ms' }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
