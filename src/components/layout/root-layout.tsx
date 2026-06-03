import { ConfirmationProvider } from '@/components/common/confirmation-provider';
import { ToastProvider } from '@/components/common/toast';
import { Titlebar } from '@/components/layout/titlebar';
import { useSettingsStore } from '@/hooks/use-settings-store';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { Suspense, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';

export function RootLayout() {
  const location = useLocation();
  const { t } = useTranslation('common');
  const theme = useSettingsStore((state) => state.theme);
  const ready = useSettingsStore((state) => state.ready);
  const developerMode = useSettingsStore((state) => state.developerMode);
  const hydrate = useSettingsStore((state) => state.hydrate);
  const hasShownWindowRef = useRef(false);

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
    <ToastProvider>
      <ConfirmationProvider>
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-bg-main text-zinc-100 font-sans selection:bg-primary/30 selection:text-primary-text">
          <Titlebar isSettingsPage={isSettingsPage} />

          <main className="flex-1 overflow-y-auto p-6 relative min-w-0">
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
      </ConfirmationProvider>
    </ToastProvider>
  );
}

export default RootLayout;
