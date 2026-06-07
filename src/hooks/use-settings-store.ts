import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';
import i18n, { I18N_LOCALE_STORAGE_KEY } from '@/i18n';

export type ThemeType = 'dark' | 'cyber' | 'neon';
export type LocaleType = 'en' | 'id';

export interface Mapping {
  button_id: number;
  key_str: string;
  mapping_type: 'Keyboard' | 'Mouse' | 'Macro' | 'System' | string;
}

export interface Profile {
  name: string;
  debounce_ms: number;
  axis_deadzone: number;
  target_exe: string;
  mappings: Mapping[];
}

interface SettingsPayload {
  values: Record<string, string>;
}

interface RuntimeInfo {
  is_portable: boolean;
}

interface SettingsState {
  ready: boolean;
  isPortable: boolean;
  runOnBoot: boolean;
  startMinimized: boolean;
  minimizeToTray: boolean;
  developerMode: boolean;
  debounce: number;
  theme: ThemeType;
  locale: LocaleType;
  activeProfile: string;
  profiles: Profile[];
  hydrate: () => Promise<void>;
  setRunOnBoot: (val: boolean) => Promise<void>;
  setStartMinimized: (val: boolean) => Promise<void>;
  setMinimizeToTray: (val: boolean) => Promise<void>;
  setDeveloperMode: (val: boolean) => Promise<void>;
  setDebounce: (val: number) => Promise<void>;
  setTheme: (theme: ThemeType) => Promise<void>;
  setLocale: (locale: LocaleType) => Promise<void>;
  setActiveProfile: (name: string) => Promise<void>;
  saveProfile: (profile: Profile) => Promise<void>;
  createProfile: (name: string) => Promise<void>;
  renameProfile: (oldName: string, newName: string) => Promise<void>;
  deleteProfile: (name: string) => Promise<void>;
  duplicateProfile: (name: string, newName: string) => Promise<void>;
  exportProfile: (name: string) => Promise<string | null>;
  importProfile: () => Promise<Profile | null>;
}

const parseBool = (value: string | undefined, fallback: boolean) => {
  if (value == null) return fallback;
  return value === 'true';
};

const parseNum = (value: string | undefined, fallback: number) => {
  if (value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const parseLocale = (value: string | undefined): LocaleType =>
  value === 'id' ? 'id' : 'en';

const fetchProfiles = async () => invoke<Profile[]>('get_profiles');

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  ready: false,
  isPortable: false,
  runOnBoot: false,
  startMinimized: false,
  minimizeToTray: true,
  developerMode: false,
  debounce: 10,
  theme: 'dark',
  locale: 'en',
  activeProfile: 'Default',
  profiles: [],

  hydrate: async () => {
    const [settings, profiles, runtimeInfo] = await Promise.all([
      invoke<SettingsPayload>('get_settings'),
      fetchProfiles(),
      invoke<RuntimeInfo>('get_runtime_info')
    ]);

    const values = settings.values ?? {};
    const theme = (values.theme as ThemeType) || 'dark';
    const locale = parseLocale(values.locale);
    const isPortable = runtimeInfo.is_portable;
    document.documentElement.setAttribute('data-theme', theme);
    void i18n.changeLanguage(locale);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(I18N_LOCALE_STORAGE_KEY, locale);
    }

    set({
      ready: true,
      isPortable,
      runOnBoot: isPortable ? false : parseBool(values.runOnBoot, false),
      startMinimized: parseBool(values.startMinimized, false),
      minimizeToTray: parseBool(values.minimizeToTray, true),
      developerMode: parseBool(values.developerMode, false),
      debounce: parseNum(values.debounce, 10),
      theme,
      locale,
      activeProfile: values.activeProfile || profiles[0]?.name || 'Default',
      profiles
    });
  },

  setRunOnBoot: async (val) => {
    if (get().isPortable) {
      set({ runOnBoot: false });
      return;
    }
    const prev = get().runOnBoot;
    set({ runOnBoot: val });
    try {
      await invoke('set_run_on_boot', { enabled: val });
    } catch (error) {
      set({ runOnBoot: prev });
      throw error;
    }
  },

  setStartMinimized: async (val) => {
    if (!get().minimizeToTray && val) return;
    set({ startMinimized: val });
    await invoke('save_setting', { key: 'startMinimized', value: String(val) });
  },

  setMinimizeToTray: async (val) => {
    set({
      minimizeToTray: val,
      startMinimized: val ? get().startMinimized : false
    });
    await invoke('save_setting', { key: 'minimizeToTray', value: String(val) });
    if (!val) {
      await invoke('save_setting', { key: 'startMinimized', value: 'false' });
    }
  },

  setDeveloperMode: async (val) => {
    set({ developerMode: val });
    await invoke('save_setting', { key: 'developerMode', value: String(val) });
  },

  setDebounce: async (val) => {
    set({ debounce: val });
    await invoke('save_setting', { key: 'debounce', value: String(val) });
  },

  setTheme: async (theme) => {
    set({ theme });
    document.documentElement.setAttribute('data-theme', theme);
    await invoke('save_setting', { key: 'theme', value: theme });
  },

  setLocale: async (locale) => {
    set({ locale });
    await i18n.changeLanguage(locale);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(I18N_LOCALE_STORAGE_KEY, locale);
    }
    await invoke('save_setting', { key: 'locale', value: locale });
  },

  setActiveProfile: async (name) => {
    set({ activeProfile: name });
    await invoke('set_active_profile', { name });
  },

  saveProfile: async (profile) => {
    await invoke('save_profile', { profile });
    const profiles = await fetchProfiles();
    set({ profiles });
  },

  createProfile: async (name) => {
    await invoke('create_profile', { name });
    const profiles = await fetchProfiles();
    set({ profiles, activeProfile: name });
    await invoke('set_active_profile', { name });
  },

  renameProfile: async (oldName, newName) => {
    await invoke('rename_profile', { oldName, newName });
    const profiles = await fetchProfiles();
    const state = get();
    const activeProfile = state.activeProfile === oldName ? newName : state.activeProfile;
    set({ profiles, activeProfile });
    if (state.activeProfile === oldName) {
      await invoke('set_active_profile', { name: newName });
    }
  },

  deleteProfile: async (name) => {
    await invoke('delete_profile', { name });
    const profiles = await fetchProfiles();
    const activeProfile = get().activeProfile;
    const hasActive = profiles.some((profile) => profile.name === activeProfile);

    set({ profiles });
    if (!hasActive && profiles[0]) {
      await get().setActiveProfile(profiles[0].name);
    }
  },

  duplicateProfile: async (name, newName) => {
    await invoke('duplicate_profile', { name, newName });
    const profiles = await fetchProfiles();
    set({ profiles });
  },

  exportProfile: async (name) => {
    return await invoke<string | null>('export_profile', { name });
  },

  importProfile: async () => {
    return await invoke<Profile | null>('import_profile');
  }
}));
