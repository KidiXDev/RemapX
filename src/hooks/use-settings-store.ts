import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';

export type ThemeType = 'dark' | 'cyber' | 'neon';

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

interface SettingsState {
  ready: boolean;
  runOnBoot: boolean;
  startMinimized: boolean;
  minimizeToTray: boolean;
  debounce: number;
  theme: ThemeType;
  activeProfile: string;
  profiles: Profile[];
  hydrate: () => Promise<void>;
  setRunOnBoot: (val: boolean) => Promise<void>;
  setStartMinimized: (val: boolean) => Promise<void>;
  setMinimizeToTray: (val: boolean) => Promise<void>;
  setDebounce: (val: number) => Promise<void>;
  setTheme: (theme: ThemeType) => Promise<void>;
  setActiveProfile: (name: string) => Promise<void>;
  saveProfile: (profile: Profile) => Promise<void>;
  deleteProfile: (name: string) => Promise<void>;
  duplicateProfile: (name: string, newName: string) => Promise<void>;
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

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  ready: false,
  runOnBoot: false,
  startMinimized: false,
  minimizeToTray: true,
  debounce: 10,
  theme: 'dark',
  activeProfile: 'Default',
  profiles: [],

  hydrate: async () => {
    const [settings, profiles] = await Promise.all([
      invoke<SettingsPayload>('get_settings'),
      invoke<Profile[]>('get_profiles')
    ]);

    const values = settings.values ?? {};
    const theme = (values.theme as ThemeType) || 'dark';
    document.documentElement.setAttribute('data-theme', theme);

    set({
      ready: true,
      runOnBoot: parseBool(values.runOnBoot, false),
      startMinimized: parseBool(values.startMinimized, false),
      minimizeToTray: parseBool(values.minimizeToTray, true),
      debounce: parseNum(values.debounce, 10),
      theme,
      activeProfile: values.activeProfile || profiles[0]?.name || 'Default',
      profiles
    });
  },

  setRunOnBoot: async (val) => {
    set({ runOnBoot: val });
    await invoke('save_setting', { key: 'runOnBoot', value: String(val) });
  },

  setStartMinimized: async (val) => {
    set({ startMinimized: val });
    await invoke('save_setting', { key: 'startMinimized', value: String(val) });
  },

  setMinimizeToTray: async (val) => {
    set({ minimizeToTray: val });
    await invoke('save_setting', { key: 'minimizeToTray', value: String(val) });
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

  setActiveProfile: async (name) => {
    set({ activeProfile: name });
    await invoke('set_active_profile', { name });
  },

  saveProfile: async (profile) => {
    await invoke('save_profile', { profile });
    const profiles = await invoke<Profile[]>('get_profiles');
    set({ profiles });
  },

  deleteProfile: async (name) => {
    await invoke('delete_profile', { name });
    const profiles = await invoke<Profile[]>('get_profiles');
    const activeProfile = get().activeProfile;
    const hasActive = profiles.some((p) => p.name === activeProfile);

    set({ profiles });
    if (!hasActive && profiles[0]) {
      await get().setActiveProfile(profiles[0].name);
    }
  },

  duplicateProfile: async (name, newName) => {
    await invoke('duplicate_profile', { name, newName });
    const profiles = await invoke<Profile[]>('get_profiles');
    set({ profiles });
  }
}));
