import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import da from './locales/da.json';

if (!i18n.isInitialized) {
  const savedLang = typeof window !== 'undefined'
    ? (localStorage.getItem('i18n-language') ?? 'en')
    : 'en';

  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      da: { translation: da },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

export default i18n;
