import { ToastProvider } from '@/components/common/toast';
import { Titlebar } from '@/components/layout/titlebar';
import {
  ConfirmationProvider,
  useConfirm
} from '@/components/providers/confirmation-provider';
import { useSettingsStore } from '@/hooks/use-settings-store';
import {
  cacheAvailableUpdate,
  checkForAppUpdate,
  clearCachedAvailableUpdate,
  getTodayStorageKey
} from '@/lib/app-update';
import { invoke } from '@tauri-apps/api/core';
import { Suspense, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router';

const AUTO_UPDATE_CHECK_STORAGE_KEY = 'app:update-last-check-date';

export function RootLayout() {
  return (
    <ToastProvider>
      <ConfirmationProvider>
        <RootLayoutContent />
      </ConfirmationProvider>
    </ToastProvider>
  );
}

function RootLayoutContent() {
  const location = useLocation();
  const { t } = useTranslation('common');
  const { t: tSettings } = useTranslation('settings');
  const theme = useSettingsStore((state) => state.theme);
  const ready = useSettingsStore((state) => state.ready);
  const autoCheckUpdates = useSettingsStore((state) => state.autoCheckUpdates);
  const developerMode = useSettingsStore((state) => state.developerMode);
  const hydrate = useSettingsStore((state) => state.hydrate);
  const confirm = useConfirm();
  const hasShownWindowRef = useRef(false);
  const hasRunAutoUpdateCheckRef = useRef(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    hydrate().catch((err) => {
      console.error('Failed to hydrate settings store', err);
    });
  }, [hydrate]);

  useEffect(() => {
    if (!ready || hasShownWindowRef.current) return;
    hasShownWindowRef.current = true;
    invoke('show_main_window').catch((err) => {
      console.error('Failed to show main window', err);
    });
  }, [ready]);

  useEffect(() => {
    if (
      !ready ||
      !autoCheckUpdates ||
      hasRunAutoUpdateCheckRef.current ||
      !import.meta.env.PROD
    ) {
      return;
    }

    hasRunAutoUpdateCheckRef.current = true;

    const todayKey = getTodayStorageKey();
    if (window.localStorage.getItem(AUTO_UPDATE_CHECK_STORAGE_KEY) === todayKey) {
      return;
    }

    window.localStorage.setItem(AUTO_UPDATE_CHECK_STORAGE_KEY, todayKey);

    void (async () => {
      try {
        const { latestTag, hasUpdate } = await checkForAppUpdate();
        if (!hasUpdate) {
          clearCachedAvailableUpdate();
          return;
        }

        cacheAvailableUpdate(latestTag);

        const wantsDownload = await confirm({
          title: tSettings('updateAvailableTitle'),
          description: tSettings('updateAvailableDesc', { version: latestTag }),
          confirmText: tSettings('updateAvailableConfirm'),
          cancelText: tSettings('updateAvailableCancel'),
          variant: 'primary'
        });

        if (!wantsDownload) return;

        const url = 'https://github.com/KidiXDev/RemapX/releases/latest';
        try {
          const { openUrl } = await import('@tauri-apps/plugin-opener');
          await openUrl(url);
        } catch {
          window.open(url, '_blank');
        }
      } catch (err) {
        console.error('Automatic update check failed', err);
      }
    })();
  }, [autoCheckUpdates, confirm, ready, tSettings]);

  useEffect(() => {
    if (!ready || !import.meta.env.PROD || !developerMode) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'F12') return;
      event.preventDefault();
      invoke('open_main_devtools').catch((err) => {
        console.error('Failed to open devtools', err);
      });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [ready, developerMode]);

  const isSettingsPage = location.pathname === '/settings';

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-bg-main text-zinc-100 font-sans selection:bg-primary/30 selection:text-primary-text">
      <Titlebar isSettingsPage={isSettingsPage} />

      <main className="flex-1 overflow-y-auto p-6 relative min-w-0 flex flex-col">
        {!ready ? (
          <div className="flex items-center justify-center h-full w-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <span className="text-xs text-zinc-400 tracking-wider">
                {t('loading.syncingControllerState')}
              </span>
            </div>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full w-full">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  <span className="text-xs text-zinc-400 tracking-wider">
                    {t('loading.syncingControllerState')}
                  </span>
                </div>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        )}
      </main>
    </div>
  );
}

export default RootLayout;
