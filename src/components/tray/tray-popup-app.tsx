import { useTauriEvent } from '@/hooks/use-tauri-event';
import { Profile } from '@/hooks/use-settings-store';
import { ConnectedGamepad } from '@/hooks/use-connected-gamepads';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Check, ExternalLink, Gamepad2, Play, Power, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SettingsPayload {
  values: Record<string, string>;
}

export function TrayPopupApp() {
  const { t } = useTranslation('common');
  const popupWindow = getCurrentWindow();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState('Default');
  const [engineRunning, setEngineRunning] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [hasGamepad, setHasGamepad] = useState(false);

  const refreshState = async () => {
    const [profilesResult, settings, running, gamepadsResult] = await Promise.all([
      invoke<Profile[]>('get_profiles'),
      invoke<SettingsPayload>('get_settings'),
      invoke<boolean>('get_engine_running'),
      invoke<ConnectedGamepad[]>('get_connected_gamepads')
    ]);

    setProfiles(profilesResult);
    setActiveProfile(settings.values.activeProfile || profilesResult[0]?.name || 'Default');
    setEngineRunning(running);
    setHasGamepad(gamepadsResult.length > 0);

    // Apply the active theme
    const theme = settings.values.theme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  };

  useEffect(() => {
    void refreshState();

    // Poll for changes every 2 seconds
    const interval = setInterval(() => {
      void refreshState();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useTauriEvent('tray-popup-opened', () => {
    void refreshState();
  });

  useTauriEvent<boolean>('engine-state-changed', (event) => {
    setEngineRunning(event.payload);
  });

  useTauriEvent<string>('active-profile-changed', (event) => {
    setActiveProfile(event.payload);
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      void popupWindow.hide();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const runAction = async (key: string, action: () => Promise<void>) => {
    setBusyAction(key);
    try {
      await action();
    } finally {
      setBusyAction(null);
    }
  };

  const closePopup = () => popupWindow.hide();

  return (
    <div className="min-h-screen bg-transparent p-3 text-zinc-100">
      <div className="flex flex-col h-[396px] overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950/98 shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="border-b border-zinc-900/80 px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-sm font-extrabold tracking-wide text-zinc-100">
                {t('appName')}
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                {t('tray.title')}
              </p>
            </div>
            
            <button
              type="button"
              disabled={busyAction !== null || (!engineRunning && !hasGamepad)}
              onClick={() =>
                void runAction('engine', async () => {
                  await invoke(engineRunning ? 'stop_engine' : 'start_engine');
                  await closePopup();
                })
              }
              title={!engineRunning && !hasGamepad ? "No gamepad detected" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] ${
                engineRunning
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40'
                  : !hasGamepad
                    ? 'border-zinc-800/40 bg-zinc-900/10 text-zinc-500 cursor-not-allowed opacity-50'
                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 hover:border-zinc-700'
              }`}
            >
              {engineRunning ? (
                <Square className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Play className={`h-3.5 w-3.5 shrink-0 ${!hasGamepad ? 'text-zinc-600' : 'text-zinc-400'}`} />
              )}
              {engineRunning ? t('tray.stopEngine') : t('tray.startEngine')}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col min-h-0 p-4">
          {/* Profile Section Header */}
          <div className="flex items-center justify-between px-1 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
              {t('tray.profiles')}
            </p>
            <span className="rounded-full bg-zinc-900/80 px-2 py-0.5 text-[10px] font-medium text-zinc-400 border border-zinc-800/40">
              {profiles.length}
            </span>
          </div>

          {/* Profiles List */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin space-y-1">
            {profiles.map((profile) => {
              const isActive = profile.name === activeProfile;
              return (
                <button
                  key={profile.name}
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() =>
                    void runAction(`profile:${profile.name}`, async () => {
                      await invoke('set_active_profile', { name: profile.name });
                      setActiveProfile(profile.name);
                      await closePopup();
                    })
                  }
                  className={`group flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition duration-200 ${
                    isActive
                      ? 'border-primary-border bg-primary-bg/50 text-primary-text'
                      : 'border-transparent bg-transparent text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Gamepad2 className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                      isActive ? 'text-primary-text' : 'text-zinc-600 group-hover:text-zinc-400'
                    }`} />
                    <span className="truncate font-semibold">{profile.name}</span>
                  </div>
                  {isActive && (
                    <Check className="h-3.5 w-3.5 text-primary-text shrink-0 animate-fade-in" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="flex gap-2 border-t border-zinc-900/80 pt-3 mt-3">
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() =>
                void runAction('show', async () => {
                  await invoke('show_main_window');
                  await closePopup();
                })
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 py-2 text-xs font-semibold text-zinc-300 transition duration-200 hover:border-zinc-700 hover:bg-zinc-800/60 hover:text-zinc-100 disabled:opacity-50"
            >
              <ExternalLink className="h-3.5 w-3.5 text-zinc-500" />
              {t('tray.showWindow')}
            </button>

            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() =>
                void runAction('quit', async () => {
                  await invoke('quit_app');
                })
              }
              className="flex items-center justify-center gap-2 rounded-xl border border-destructive-border bg-destructive-bg px-4 py-2 text-xs font-semibold text-destructive-text transition duration-200 hover:border-destructive-border/80 hover:bg-destructive-bg/80 hover:text-destructive-text disabled:opacity-50"
            >
              <Power className="h-3.5 w-3.5" />
              {t('tray.quit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrayPopupApp;

