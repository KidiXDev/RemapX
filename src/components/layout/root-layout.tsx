import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { cn } from '../../lib/utils';

// Simple Inline SVG Icons to avoid external dependencies
const HomeIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const GamepadIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 100 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 100-4V7a2 2 0 00-2-2H5z"
    />
  </svg>
);

const CogIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

export function RootLayout() {
  const [controllerConnected, setControllerConnected] = useState(true);
  const [ping, setPing] = useState(1);

  // Simulate subtle updates to controller details
  useEffect(() => {
    const interval = setInterval(() => {
      setPing((prev) => {
        const delta = Math.floor(Math.random() * 3) - 1;
        const next = prev + delta;
        return next > 0 ? (next < 5 ? next : 3) : 1;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Sidebar Navigation */}
      <aside className="relative flex flex-col w-64 bg-zinc-900/50 border-r border-zinc-800/80 backdrop-blur-xl z-20 shrink-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-zinc-800/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wider uppercase bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              RemapX
            </h1>
            <p className="text-[10px] text-zinc-500 font-medium tracking-widest uppercase">
              Tauri Controller Engine
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative group overflow-hidden',
                isActive
                  ? 'text-cyan-400 bg-cyan-950/20 border border-cyan-800/50 shadow-inner shadow-cyan-500/5'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-3 bottom-3 w-1 bg-cyan-400 rounded-r-md" />
                )}
                <HomeIcon />
                <span>Dashboard</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/remap"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative group overflow-hidden',
                isActive
                  ? 'text-cyan-400 bg-cyan-950/20 border border-cyan-800/50 shadow-inner shadow-cyan-500/5'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-3 bottom-3 w-1 bg-cyan-400 rounded-r-md" />
                )}
                <GamepadIcon />
                <span>Remap Canvas</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative group overflow-hidden',
                isActive
                  ? 'text-cyan-400 bg-cyan-950/20 border border-cyan-800/50 shadow-inner shadow-cyan-500/5'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-3 bottom-3 w-1 bg-cyan-400 rounded-r-md" />
                )}
                <CogIcon />
                <span>Settings</span>
              </>
            )}
          </NavLink>
        </nav>

        {/* Sidebar Footer / Controller Info */}
        <div className="p-4 border-t border-zinc-800/60 bg-zinc-950/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              DualSense Edge
            </span>
            <button
              onClick={() => setControllerConnected(!controllerConnected)}
              className="text-[9px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700/50 cursor-pointer transition-colors"
            >
              {controllerConnected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-all duration-500 relative',
                controllerConnected
                  ? 'bg-emerald-400 shadow-md shadow-emerald-400/50 after:absolute after:inset-0 after:rounded-full after:bg-emerald-400 after:animate-ping after:opacity-70'
                  : 'bg-rose-500 shadow-md shadow-rose-500/30'
              )}
            />
            <span className="text-xs font-medium text-zinc-300">
              {controllerConnected ? `Active (Latency: ${ping}ms)` : 'Offline'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Top Header */}
        <header className="h-16 border-b border-zinc-800/80 bg-zinc-900/20 backdrop-blur-md flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="text-xs text-zinc-400 flex items-center gap-1.5 bg-zinc-800/40 px-3 py-1 rounded-full border border-zinc-800">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>Daemon v2.0.4 Online</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-zinc-400">
              Active Profile:{' '}
              <span className="text-cyan-400">FPS_Apex_Legends</span>
            </div>
          </div>
        </header>

        {/* Content Viewport */}
        <div className="flex-1 overflow-y-auto p-8 relative min-w-0">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full w-full">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                  <span className="text-xs text-zinc-400 tracking-wider">
                    Syncing Controller State...
                  </span>
                </div>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
export default RootLayout;
