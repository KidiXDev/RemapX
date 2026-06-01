import { Suspense, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { useSettingsStore } from '@/hooks/use-settings-store';
import { Gamepad2, Settings as SettingsIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/common/button';

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
      {/* Top Header */}
      <header className="h-16 border-b border-border-main bg-bg-header backdrop-blur-md flex items-center justify-between px-6 z-20 shrink-0">
        {/* Left Side: Brand Logo & Status */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-primary to-primary-hover flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              <Gamepad2 className="w-4 h-4 text-zinc-950 font-bold" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wider uppercase bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                RemapX
              </h1>
              <p className="text-[9px] text-zinc-500 font-semibold tracking-widest uppercase">
                Tauri Controller Engine
              </p>
            </div>
          </Link>
        </div>

        {/* Right Side: Active Profile & Navigation */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-zinc-900/30 border border-border-main px-3 py-1.5 rounded-full">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Active Profile:</span>
            <span className="text-xs font-bold text-primary-text">FPS_Apex_Legends</span>
          </div>

          {isSettingsPage ? (
            <Link to="/" title="Back to Canvas">
              <Button variant="primary" className="p-2.5">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <Link to="/settings" title="Settings">
              <Button variant="icon">
                <SettingsIcon className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </header>

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
