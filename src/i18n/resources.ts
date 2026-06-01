import commonEn from '@/locales/en/common.json';
import remapEn from '@/locales/en/remap.json';
import settingsEn from '@/locales/en/settings.json';
import commonId from '@/locales/id/common.json';
import remapId from '@/locales/id/remap.json';
import settingsId from '@/locales/id/settings.json';

export const defaultNS = 'common';

export const resources = {
  en: {
    common: commonEn,
    remap: remapEn,
    settings: settingsEn
  },
  id: {
    common: commonId,
    remap: remapId,
    settings: settingsId
  }
} as const;

export type AppLocale = keyof typeof resources;
