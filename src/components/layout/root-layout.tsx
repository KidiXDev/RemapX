import { Titlebar } from '@/components/layout/titlebar';
import { useSettingsStore } from '@/hooks/use-settings-store';
import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';

export function RootLayout() {
  const location = useLocation();
  const theme = useSettingsStore((state) => state.theme);

  // Sync the theme attribute with document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const isSettingsPage = location.pathname === '/settings';

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-bg-main text-zinc-100 font-sans selection:bg-primary/30 selection:text-primary-text">
      <Titlebar isSettingsPage={isSettingsPage} />

      {/* Content Viewport */}
      <main className="flex-1 overflow-y-auto p-6 relative min-w-0">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full w-full">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <span className="text-xs text-zinc-400 tracking-wider">
                  Syncing Controller State...
                </span>
              </div>
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

export default RootLayout;
