import { Button } from '@/components/common/button';
import { Card } from '@/components/common/card';
import { Dialog } from '@/components/common/dialog';
import { Tabs } from '@/components/common/tabs';
import { ContentLayout } from '@/components/layout/content-layout';
import { Gamepad } from '@/components/template/gamepad';
import { Mapping, Profile, useSettingsStore } from '@/hooks/use-settings-store';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useDebounce } from 'use-debounce';
import { Pause, Pencil, Play, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface EngineLogPayload {
  message: string;
}

interface ConnectedGamepad {
  id: string;
  name: string;
}

interface ActiveProcess {
  pid: number;
  exe_name: string;
}

type TabType = 'bindings' | 'live';

const EMPTY_PROFILE: Profile = {
  name: 'Default',
  debounce_ms: 10,
  axis_deadzone: 0.12,
  target_exe: '',
  mappings: []
};

const buttonLabelMap: Record<number, string> = {
  0: 'A',
  1: 'B',
  2: 'X',
  3: 'Y',
  4: 'LB',
  5: 'RB',
  6: 'LT',
  7: 'RT',
  8: 'Select',
  9: 'Start',
  10: 'Mode',
  11: 'L3',
  12: 'R3',
  13: 'D-Up',
  14: 'D-Down',
  15: 'D-Left',
  16: 'D-Right'
};

export function Remap() {
  const {
    profiles,
    activeProfile,
    setActiveProfile,
    saveProfile,
    createProfile,
    renameProfile,
    deleteProfile,
    duplicateProfile
  } = useSettingsStore();

  const active = useMemo(
    () => profiles.find((profile) => profile.name === activeProfile) ?? EMPTY_PROFILE,
    [profiles, activeProfile]
  );

  const [activeTab, setActiveTab] = useState<TabType>('bindings');
  const [logs, setLogs] = useState<string[]>([]);
  const [engineRunning, setEngineRunning] = useState(false);
  const [connectedGamepads, setConnectedGamepads] = useState<ConnectedGamepad[]>(
    []
  );
  const [isLoadingGamepads, setIsLoadingGamepads] = useState(false);

  const [recordingTarget, setRecordingTarget] = useState<{
    buttonId: number;
    label: string;
  } | null>(null);

  const [newProfileName, setNewProfileName] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [processQuery, setProcessQuery] = useState('');
  const [debouncedProcessQuery] = useDebounce(processQuery, 250);
  const [processes, setProcesses] = useState<ActiveProcess[]>([]);
  const [isLoadingProcesses, setIsLoadingProcesses] = useState(false);

  const targetList = useMemo(
    () =>
      active.target_exe
        .split(/[,;\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    [active.target_exe]
  );

  const targetDisplay = targetList.length
    ? targetList.join(', ')
    : 'Global (no target executable set)';

  const loadConnectedGamepads = async () => {
    setIsLoadingGamepads(true);
    try {
      const pads = await invoke<ConnectedGamepad[]>('get_connected_gamepads');
      setConnectedGamepads(pads);
    } catch (error) {
      console.error('Failed to load connected gamepads', error);
      setConnectedGamepads([]);
    } finally {
      setIsLoadingGamepads(false);
    }
  };

  const loadProcesses = async (query = '') => {
    setIsLoadingProcesses(true);
    try {
      const list = await invoke<ActiveProcess[]>('get_active_processes', {
        query: query || null
      });
      setProcesses(list);
    } catch (error) {
      console.error('Failed to load process list', error);
      setProcesses([]);
    } finally {
      setIsLoadingProcesses(false);
    }
  };

  useEffect(() => {
    loadConnectedGamepads();
  }, []);

  useEffect(() => {
    if (isProcessDialogOpen) {
      loadProcesses(debouncedProcessQuery);
    }
  }, [debouncedProcessQuery, isProcessDialogOpen]);

  useEffect(() => {
    invoke('start_engine')
      .then(() => setEngineRunning(true))
      .catch((err) => console.error('Failed to auto-start engine', err));

    return () => {
      invoke('stop_engine').catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!recordingTarget) return;

    const onKeyDown = async (event: KeyboardEvent) => {
      event.preventDefault();

      const raw =
        event.key.length === 1
          ? event.key.toUpperCase()
          : event.code
              .replace(/^Key/, '')
              .replace(/^Digit/, '')
              .replace(/^Arrow/, '');
      const keyStr = raw === ' ' ? 'SPACE' : raw.toUpperCase();

      const nextMappings: Mapping[] = [...active.mappings];
      const index = nextMappings.findIndex(
        (item) => item.button_id === recordingTarget.buttonId
      );
      const mapping: Mapping = {
        button_id: recordingTarget.buttonId,
        key_str: keyStr,
        mapping_type: 'Keyboard'
      };

      if (index >= 0) {
        nextMappings[index] = mapping;
      } else {
        nextMappings.push(mapping);
      }

      await saveProfile({ ...active, mappings: nextMappings });

      const time = new Date().toLocaleTimeString();
      setLogs((prev) => [
        `[${time}] Remapped ${recordingTarget.label} -> ${keyStr}`,
        ...prev.slice(0, 99)
      ]);
      setRecordingTarget(null);
    };

    window.addEventListener('keydown', onKeyDown, { once: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [recordingTarget, active, saveProfile]);

  useEffect(() => {
    let unlistenLog: (() => void) | undefined;
    let unlistenActive: (() => void) | undefined;
    let unlistenButton: (() => void) | undefined;

    listen<EngineLogPayload>('engine-log', (event) => {
      const time = new Date().toLocaleTimeString();
      setLogs((prev) => [`[${time}] ${event.payload.message}`, ...prev.slice(0, 99)]);
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
        ...prev.slice(0, 99)
      ]);
    })
      .then((fn) => {
        unlistenActive = fn;
      })
      .catch((err) => console.error('Failed to listen active-profile-changed', err));

    listen<{ button_id: number; pressed: boolean }>('gamepad-button-state', (event) => {
      if (!event.payload.pressed) return;
      const label = buttonLabelMap[event.payload.button_id] || String(event.payload.button_id);
      const time = new Date().toLocaleTimeString();
      setLogs((prev) => [`[${time}] Button ${label} pressed`, ...prev.slice(0, 99)]);
    })
      .then((fn) => {
        unlistenButton = fn;
      })
      .catch((err) => console.error('Failed to listen gamepad-button-state', err));

    return () => {
      if (unlistenLog) unlistenLog();
      if (unlistenActive) unlistenActive();
      if (unlistenButton) unlistenButton();
    };
  }, [setActiveProfile]);

  const tabOptions = [
    {
      id: 'bindings' as TabType,
      label: `Key Bindings (${active.mappings.length})`
    },
    { id: 'live' as TabType, label: 'Diagnostics' }
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

  const saveTargetList = async (items: string[]) => {
    const unique = Array.from(
      new Set(items.map((item) => item.trim().toLowerCase()).filter(Boolean))
    );
    await saveProfile({ ...active, target_exe: unique.join(', ') });
  };

  const onAddTarget = async (exeName: string) => {
    await saveTargetList([...targetList, exeName]);
  };

  const onRemoveTarget = async (exeName: string) => {
    await saveTargetList(targetList.filter((item) => item !== exeName));
  };

  const onDeleteMapping = async (buttonId: number) => {
    await saveProfile({
      ...active,
      mappings: active.mappings.filter((item) => item.button_id !== buttonId)
    });
  };

  const onCreateProfile = async () => {
    const name = newProfileName.trim();
    if (!name) return;
    await createProfile(name);
    setNewProfileName('');
  };

  const onRenameProfile = async () => {
    const value = renameValue.trim();
    if (!value || value === active.name) return;
    await renameProfile(active.name, value);
    setIsRenaming(false);
    setRenameValue('');
  };

  return (
    <>
      <ContentLayout
        title="Remap Canvas"
        description="Live remapping, profile management, and process-based auto switching."
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
              onClick={() => duplicateProfile(active.name, `${active.name} Copy`)}
            >
              <Save className="w-3.5 h-3.5 text-zinc-400" />
              <span>Duplicate</span>
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-5 flex flex-col gap-4">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              Interactive Mapping Blueprint
            </span>
            <Gamepad
              onButtonPress={() => {}}
              mappings={active.mappings}
              onControlSelect={(buttonId, label) => {
                setRecordingTarget({ buttonId, label });
              }}
            />

            {recordingTarget && (
              <div className="w-full rounded-xl border border-primary-border bg-primary-bg px-3 py-2 text-xs text-primary-text">
                Record mode for <strong>{recordingTarget.label}</strong>. Press any
                keyboard key, or{' '}
                <button
                  onClick={() => setRecordingTarget(null)}
                  className="underline"
                >
                  cancel
                </button>
                .
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs text-zinc-400">Profile</label>
              <div className="flex gap-2">
                <select
                  value={activeProfile}
                  onChange={(e) => setActiveProfile(e.target.value)}
                  className="flex-1 rounded-lg bg-zinc-900/40 border border-border-main px-3 py-2 text-sm"
                >
                  {profiles.map((profile) => (
                    <option key={profile.name} value={profile.name}>
                      {profile.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsRenaming(true);
                    setRenameValue(active.name);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteProfile(active.name)}
                  disabled={profiles.length <= 1}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              {isRenaming && (
                <div className="flex gap-2">
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="flex-1 rounded-lg bg-zinc-900/40 border border-border-main px-3 py-2 text-sm"
                  />
                  <Button variant="secondary" onClick={onRenameProfile}>
                    Save
                  </Button>
                  <Button variant="secondary" onClick={() => setIsRenaming(false)}>
                    Cancel
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="New profile name"
                  className="flex-1 rounded-lg bg-zinc-900/40 border border-border-main px-3 py-2 text-sm"
                />
                <Button variant="secondary" onClick={onCreateProfile}>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create</span>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400">Target Executables</label>
              <div className="flex gap-2">
                <input
                  value={targetDisplay}
                  readOnly
                  className="flex-1 rounded-lg bg-zinc-900/40 border border-border-main px-3 py-2 text-sm text-zinc-300"
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsProcessDialogOpen(true);
                    setProcessQuery('');
                    loadProcesses('');
                  }}
                >
                  Browse
                </Button>
              </div>
              {targetList.length === 0 ? (
                <p className="text-[11px] text-zinc-500">
                  Global mode is active because no target executable is set.
                </p>
              ) : null}
            </div>

            <div className="w-full rounded-xl border border-border-main/60 bg-zinc-950/25 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wide">
                  Connected Gamepads
                </span>
                <Button variant="secondary" onClick={loadConnectedGamepads}>
                  Refresh
                </Button>
              </div>
              {isLoadingGamepads ? (
                <p className="text-xs text-zinc-500">Scanning devices...</p>
              ) : connectedGamepads.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  No gamepad detected. Connect a controller and click Refresh.
                </p>
              ) : (
                <div className="space-y-1">
                  {connectedGamepads.map((pad) => (
                    <div
                      key={pad.id}
                      className="text-xs text-zinc-300 rounded-md border border-border-main/40 px-2 py-1.5 bg-zinc-900/25"
                    >
                      {pad.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card className="lg:col-span-7 overflow-hidden p-0 h-[700px] flex flex-col space-y-0">
            <Tabs options={tabOptions} activeId={activeTab} onChange={setActiveTab} />

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {activeTab === 'bindings' ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-3 mb-2">
                    <div className="col-span-3">Input</div>
                    <div className="col-span-4">Mapped Key</div>
                    <div className="col-span-3">Type</div>
                    <div className="col-span-2 text-right">Action</div>
                  </div>

                  {active.mappings.length === 0 ? (
                    <div className="text-xs text-zinc-500 border border-border-main/50 rounded-xl p-4">
                      No keybindings yet. Click a control on the gamepad to enter
                      record mode.
                    </div>
                  ) : (
                    active.mappings.map((map) => (
                      <div
                        key={`${active.name}-${map.button_id}`}
                        className="grid grid-cols-12 items-center bg-zinc-950/20 border border-border-main/50 rounded-xl px-4 py-2.5"
                      >
                        <div className="col-span-3 text-xs font-bold text-zinc-200">
                          {buttonLabelMap[map.button_id] || `Button ${map.button_id}`}
                        </div>
                        <div className="col-span-4 text-xs font-semibold text-zinc-300">
                          {map.key_str}
                        </div>
                        <div className="col-span-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-900/60 text-zinc-400 border border-border-main/60">
                            {map.mapping_type}
                          </span>
                        </div>
                        <div className="col-span-2 text-right">
                          <button
                            onClick={() => onDeleteMapping(map.button_id)}
                            className="text-zinc-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="font-mono text-[11px] space-y-1 bg-zinc-950/50 p-4 rounded-xl border border-border-main overflow-y-auto min-h-[250px] max-h-[560px]">
                  {logs.length === 0 ? (
                    <div className="text-zinc-500">No diagnostic log yet.</div>
                  ) : (
                    logs.map((log, idx) => (
                      <div
                        key={idx}
                        className={
                          log.includes('pressed')
                            ? 'text-primary-text font-bold'
                            : 'text-zinc-400'
                        }
                      >
                        {log}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </ContentLayout>

      <Dialog
        open={isProcessDialogOpen}
        onClose={() => setIsProcessDialogOpen(false)}
        title="Process Explorer"
        description="Select foreground applications with visible windows. Background services are hidden."
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-border-main bg-zinc-950/40 px-3 py-2">
            <Search className="w-3.5 h-3.5 text-zinc-500" />
            <input
              value={processQuery}
              onChange={(e) => setProcessQuery(e.target.value)}
              placeholder="Search executable name"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1">
            {isLoadingProcesses ? (
              <p className="text-xs text-zinc-500">Loading processes...</p>
            ) : processes.length === 0 ? (
              <p className="text-xs text-zinc-500">No matching process.</p>
            ) : (
              processes.map((proc) => {
                const added = targetList.includes(proc.exe_name.toLowerCase());
                return (
                  <div
                    key={`${proc.exe_name}-${proc.pid}`}
                    className="flex items-center justify-between rounded-md border border-border-main/50 px-2 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-200 truncate">{proc.exe_name}</p>
                      <p className="text-[10px] text-zinc-500">PID {proc.pid}</p>
                    </div>
                    {added ? (
                      <button
                        onClick={() => onRemoveTarget(proc.exe_name.toLowerCase())}
                        className="text-zinc-400 hover:text-red-400"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => onAddTarget(proc.exe_name.toLowerCase())}
                      >
                        Add
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}

export default Remap;
