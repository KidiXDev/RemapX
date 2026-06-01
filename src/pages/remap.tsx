import { Button } from '@/components/common/button';
import { Card } from '@/components/common/card';
import { Tabs } from '@/components/common/tabs';
import { ContentLayout } from '@/components/layout/content-layout';
import { Gamepad } from '@/components/template/gamepad';
import { useSettingsStore } from '@/hooks/use-settings-store';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { ChevronsRight, Pause, Play, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface EngineLogPayload {
  message: string;
}

type TabType = 'bindings' | 'live';

export function Remap() {
  const {
    profiles,
    activeProfile,
    setActiveProfile,
    saveProfile,
    duplicateProfile
  } = useSettingsStore();

  const active = useMemo(
    () => profiles.find((profile) => profile.name === activeProfile),
    [profiles, activeProfile]
  );

  const [activeTab, setActiveTab] = useState<TabType>('bindings');
  const [logs, setLogs] = useState<string[]>([]);
  const [engineRunning, setEngineRunning] = useState(false);
  const [targetExe, setTargetExe] = useState('');

  useEffect(() => {
    setTargetExe(active?.target_exe ?? '');
  }, [active?.target_exe]);

  useEffect(() => {
    let unlistenLog: (() => void) | undefined;
    let unlistenActive: (() => void) | undefined;

    listen<EngineLogPayload>('engine-log', (event) => {
      const time = new Date().toLocaleTimeString();
      setLogs((prev) => [`[${time}] ${event.payload.message}`, ...prev.slice(0, 49)]);
    })
      .then((fn) => {
        unlistenLog = fn;
      })
      .catch((err) => console.error('Failed to listen engine-log', err));

    listen<string>('active-profile-changed', (event) => {
      setActiveProfile(event.payload).catch((err) => {
        console.error('Failed to set active profile', err);
      });
      const time = new Date().toLocaleTimeString();
      setLogs((prev) => [
        `[${time}] Auto-switched profile to ${event.payload}`,
        ...prev.slice(0, 49)
      ]);
    })
      .then((fn) => {
        unlistenActive = fn;
      })
      .catch((err) => console.error('Failed to listen active-profile-changed', err));

    return () => {
      if (unlistenLog) unlistenLog();
      if (unlistenActive) unlistenActive();
    };
  }, [setActiveProfile]);

  const addSimulatedPress = (button: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] Pressed: ${button}`, ...prev.slice(0, 49)]);
  };

  const tabOptions = [
    {
      id: 'bindings' as TabType,
      label: `Active Key Bindings (${active?.mappings.length ?? 0})`
    },
    { id: 'live' as TabType, label: 'Diagnostics & Input Monitor' }
  ];

  const onToggleEngine = async () => {
    if (!engineRunning) {
      await invoke('start_engine');
      setEngineRunning(true);
      return;
    }

    await invoke('stop_engine');
    setEngineRunning(false);
  };

  const onSaveTargetExe = async () => {
    if (!active) return;
    await saveProfile({ ...active, target_exe: targetExe.trim() });
  };

  return (
    <ContentLayout
      title="Remap Canvas"
      description="Configure trigger deadzones, stick curves, and custom button assignments."
      actions={
        <>
          <Button variant="primary" onClick={onToggleEngine}>
            {engineRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Stop Engine</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Start Engine</span>
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (active) duplicateProfile(active.name, `${active.name} Copy`);
            }}
          >
            <Save className="w-3.5 h-3.5 text-zinc-400" />
            <span>Duplicate Profile</span>
          </Button>
          <Button variant="secondary">
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Revert Changes</span>
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-5 items-center justify-between min-h-[450px] flex flex-col space-y-0">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest self-start">
            Interactive Mapping Blueprint
          </span>
          <Gamepad onButtonPress={addSimulatedPress} mappings={active?.mappings} />

          <div className="w-full space-y-2">
            <label className="text-xs text-zinc-400">Active Profile</label>
            <select
              value={activeProfile}
              onChange={(e) => setActiveProfile(e.target.value)}
              className="w-full rounded-lg bg-zinc-900/40 border border-border-main px-3 py-2 text-sm"
            >
              {profiles.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>

            <label className="text-xs text-zinc-400">Auto Switch Target EXE</label>
            <div className="flex gap-2">
              <input
                value={targetExe}
                onChange={(e) => setTargetExe(e.target.value)}
                placeholder="example: eldenring.exe"
                className="flex-1 rounded-lg bg-zinc-900/40 border border-border-main px-3 py-2 text-sm"
              />
              <Button variant="secondary" onClick={onSaveTargetExe}>
                Save
              </Button>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-7 overflow-hidden p-0 h-[450px] flex flex-col space-y-0">
          <Tabs options={tabOptions} activeId={activeTab} onChange={setActiveTab} />

          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === 'bindings' ? (
              <div className="space-y-2">
                <div className="grid grid-cols-12 text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-3 mb-2">
                  <div className="col-span-3">Button ID</div>
                  <div className="col-span-5">Mapped Output</div>
                  <div className="col-span-4 text-right">Type</div>
                </div>

                {(active?.mappings ?? []).map((map) => (
                  <div
                    key={`${active?.name}-${map.button_id}`}
                    className="grid grid-cols-12 items-center bg-zinc-950/20 border border-border-main/50 rounded-xl px-4 py-2.5 hover:border-border-hover hover:bg-zinc-900/10 transition-colors"
                  >
                    <div className="col-span-3 text-xs font-bold text-zinc-200">
                      {map.button_id}
                    </div>
                    <div className="col-span-5 flex items-center gap-2">
                      <ChevronsRight className="w-3.5 h-3.5 text-primary-text animate-pulse" />
                      <span className="text-xs font-semibold text-zinc-300">
                        {map.key_str}
                      </span>
                    </div>
                    <div className="col-span-4 text-right">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-900/60 text-zinc-400 border border-border-main/60">
                        {map.mapping_type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col justify-between">
                <div className="font-mono text-[11px] space-y-1 bg-zinc-950/50 p-4 rounded-xl border border-border-main flex-1 overflow-y-auto min-h-[250px]">
                  {logs.map((log, idx) => (
                    <div
                      key={idx}
                      className={
                        log.includes('Pressed')
                          ? 'text-primary-text font-bold'
                          : 'text-zinc-400'
                      }
                    >
                      {log}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2.5 mt-4 shrink-0">
                  <Button
                    variant="secondary"
                    onClick={() => setLogs([])}
                    className="px-3.5 py-1.5 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Clear Diagnostics</span>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => addSimulatedPress('D-Pad Right')}
                    className="px-3.5 py-1.5 rounded-lg bg-primary-bg hover:bg-primary/25 border-primary-border/40 text-primary-text hover:text-primary-text"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Test Input Injection</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </ContentLayout>
  );
}

export default Remap;
