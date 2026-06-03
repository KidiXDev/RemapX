import { useSettingsStore } from '@/hooks/use-settings-store';
import { useTauriEvent } from '@/hooks/use-tauri-event';
import { cn } from '@/lib/utils';
import { Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buttonLabelMap } from './mappings-list';

interface EngineLogPayload {
  message: string;
}

export function DiagnosticsTerminal() {
  const { t } = useTranslation('remap');
  const { developerMode, setActiveProfile } = useSettingsStore();
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const handleLogAdd = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      const time = new Date().toLocaleTimeString();
      setLogs((prev) => [`[${time}] ${detail}`, ...prev.slice(0, 99)]);
    };
    window.addEventListener('engine-log-add', handleLogAdd);
    return () => window.removeEventListener('engine-log-add', handleLogAdd);
  }, []);

  useTauriEvent<EngineLogPayload>('engine-log', (event) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [
      `[${time}] ${event.payload.message}`,
      ...prev.slice(0, 99)
    ]);
  });

  useTauriEvent<string>(
    'active-profile-changed',
    (event) => {
      setActiveProfile(event.payload).catch((err) => {
        console.error('Failed to set active profile', err);
      });
      const time = new Date().toLocaleTimeString();
      setLogs((prev) => [
        `[${time}] ${t('logs.autoSwitchedPrefix')} ${event.payload}`,
        ...prev.slice(0, 99)
      ]);
    },
    [t]
  );

  useTauriEvent<{ button_id: number; pressed: boolean }>(
    'gamepad-button-state',
    (event) => {
      if (!event.payload.pressed || !developerMode) return;
      const label =
        buttonLabelMap[event.payload.button_id] ||
        String(event.payload.button_id);
      const time = new Date().toLocaleTimeString();
      setLogs((prev) => [
        `[${time}] ${t('logs.buttonPressedPrefix')} ${label} ${t('logs.buttonPressedSuffix')}`,
        ...prev.slice(0, 99)
      ]);
    },
    [developerMode, t]
  );

  return (
    <div className="flex flex-col rounded-xl border border-border-main/70 bg-zinc-950/70 overflow-hidden font-mono text-xs h-full min-h-0 flex-1">
      {/* Terminal Header */}
      <div className="flex items-center justify-between bg-zinc-900/60 border-b border-border-main/70 px-4 py-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          <span className="text-xs font-bold text-zinc-400 ml-2 tracking-wider flex items-center gap-1">
            <Terminal className="w-3.5 h-3.5" />
            <span>{t('diagnostics.streamTitle')}</span>
          </span>
        </div>
        <button
          onClick={() => setLogs([])}
          className="text-xs font-bold text-zinc-400 hover:text-zinc-200 transition bg-zinc-900 border border-border-main px-2 py-0.5 rounded cursor-pointer"
        >
          {t('diagnostics.clearLogs')}
        </button>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {logs.length === 0 ? (
          <div className="text-zinc-500 italic py-4 text-center">
            {t('diagnostics.empty')}
          </div>
        ) : (
          logs.map((log, idx) => {
            let logColor = 'text-zinc-400';
            if (log.includes('pressed')) {
              logColor = 'text-primary-text font-semibold';
            } else if (log.includes(t('logs.remappedPrefix'))) {
              logColor = 'text-emerald-400';
            } else if (log.includes(t('logs.autoSwitchedPrefix'))) {
              logColor = 'text-amber-400';
            }

            return (
              <div
                key={idx}
                className={cn('transition-all duration-150 py-0.5', logColor)}
              >
                {log}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
