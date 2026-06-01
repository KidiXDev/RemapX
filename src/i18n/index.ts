import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { defaultNS, resources, type AppLocale } from '@/i18n/resources';

const STORAGE_KEY = 'app.locale';

function readInitialLocale(): AppLocale {
  if (typeof window === 'undefined') return 'en';
  const fromStorage = window.localStorage.getItem(STORAGE_KEY);
  if (fromStorage === 'en' || fromStorage === 'id') return fromStorage;
  return 'en';
}

void i18n.use(initReactI18next).init({
  resources,
  lng: readInitialLocale(),
  fallbackLng: 'en',
  defaultNS,
  interpolation: {
    escapeValue: false
  }
});

export { STORAGE_KEY as I18N_LOCALE_STORAGE_KEY };
export default i18n;
