import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeType = 'dark' | 'cyber' | 'neon';

interface SettingsState {
  runOnBoot: boolean;
  startMinimized: boolean;
  minimizeToTray: boolean;
  debounce: number;
  theme: ThemeType;
  setRunOnBoot: (val: boolean) => void;
  setStartMinimized: (val: boolean) => void;
  setMinimizeToTray: (val: boolean) => void;
  setDebounce: (val: number) => void;
  setTheme: (theme: ThemeType) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      runOnBoot: true,
      startMinimized: true,
      minimizeToTray: true,
      debounce: 10,
      theme: 'dark',
      setRunOnBoot: (val) => set({ runOnBoot: val }),
      setStartMinimized: (val) => set({ startMinimized: val }),
      setMinimizeToTray: (val) => set({ minimizeToTray: val }),
      setDebounce: (val) => set({ debounce: val }),
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
      },
    }),
    {
      name: 'remapx-settings',
    }
  )
);
