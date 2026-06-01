import { Button } from '@/components/common/button';
import { Card } from '@/components/common/card';
import { useConfirm } from '@/components/common/confirmation-provider';
import { Dialog } from '@/components/common/dialog';
import { Select } from '@/components/common/select';
import { Slider } from '@/components/common/slider';
import { Tabs } from '@/components/common/tabs';
import { ContentLayout } from '@/components/layout/content-layout';
import { Gamepad } from '@/components/template/gamepad';
import { Mapping, Profile, useSettingsStore } from '@/hooks/use-settings-store';
import { cn } from '@/lib/utils';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  Activity,
  Gamepad as GamepadIcon,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Terminal,
  Trash2,
  X,
  Zap
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useDebounce } from 'use-debounce';

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
    duplicateProfile,
    developerMode
  } = useSettingsStore();

  const confirm = useConfirm();

  const active = useMemo(
    () =>
      profiles.find((profile) => profile.name === activeProfile) ??
      EMPTY_PROFILE,
    [profiles, activeProfile]
  );

  const handleDeleteProfile = async () => {
    const confirmed = await confirm({
      title: 'Delete Profile',
      description: `Are you sure you want to delete the profile "${active.name}"? This will permanently remove all configured key bindings.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive'
    });
    if (confirmed) {
      deleteProfile(active.name);
    }
  };

  const [activeTab, setActiveTab] = useState<TabType>('bindings');
  const [logs, setLogs] = useState<string[]>([]);
  const [engineRunning, setEngineRunning] = useState(false);
  const [connectedGamepads, setConnectedGamepads] = useState<
    ConnectedGamepad[]
  >([]);
  const [isLoadingGamepads, setIsLoadingGamepads] = useState(false);

  const [recordingTarget, setRecordingTarget] = useState<{
    buttonId: number;
    label: string;
  } | null>(null);

  const [newProfileName, setNewProfileName] = useState('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [processQuery, setProcessQuery] = useState('');
  const [debouncedProcessQuery] = useDebounce(processQuery, 250);
  const [processes, setProcesses] = useState<ActiveProcess[]>([]);
  const [isLoadingProcesses, setIsLoadingProcesses] = useState(false);

  const [bindingsQuery, setBindingsQuery] = useState('');

  const targetList = useMemo(
    () =>
      active.target_exe
        .split(/[,;\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    [active.target_exe]
  );

  const filteredMappings = useMemo(() => {
    if (!bindingsQuery.trim()) return active.mappings;
    const query = bindingsQuery.toLowerCase();
    return active.mappings.filter((map) => {
      const btnLabel = (buttonLabelMap[map.button_id] || '').toLowerCase();
      const keyStr = (map.key_str || '').toLowerCase();
      return btnLabel.includes(query) || keyStr.includes(query);
    });
  }, [active.mappings, bindingsQuery]);

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
      setLogs((prev) => [
        `[${time}] ${event.payload.message}`,
        ...prev.slice(0, 99)
      ]);
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
      .catch((err) =>
        console.error('Failed to listen active-profile-changed', err)
      );

    listen<{ button_id: number; pressed: boolean }>(
      'gamepad-button-state',
      (event) => {
        if (!event.payload.pressed || !developerMode) return;
        const label =
          buttonLabelMap[event.payload.button_id] ||
          String(event.payload.button_id);
        const time = new Date().toLocaleTimeString();
        setLogs((prev) => [
          `[${time}] Button ${label} pressed`,
          ...prev.slice(0, 99)
        ]);
      }
    )
      .then((fn) => {
        unlistenButton = fn;
      })
      .catch((err) =>
        console.error('Failed to listen gamepad-button-state', err)
      );

    return () => {
      if (unlistenLog) unlistenLog();
      if (unlistenActive) unlistenActive();
      if (unlistenButton) unlistenButton();
    };
  }, [setActiveProfile, developerMode]);

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
    setIsCreatingProfile(false);
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
              onClick={() =>
                duplicateProfile(active.name, `${active.name} Copy`)
              }
            >
              <Save className="w-3.5 h-3.5 text-zinc-400" />
              <span>Duplicate</span>
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT/CENTER WORKSPACE COLUMN: Gamepad Canvas & Tabs */}
          <div className="lg:col-span-7 space-y-6 flex flex-col">
            {/* Gamepad Canvas Card */}
            <Card className="relative flex flex-col items-center justify-center p-6 border-border-main/70 bg-bg-card min-h-[380px] overflow-hidden">
              <div className="w-full flex justify-center py-4">
                <Gamepad
                  onButtonPress={() => {}}
                  mappings={active.mappings}
                  onControlSelect={(buttonId, label) => {
                    setRecordingTarget({ buttonId, label });
                  }}
                />
              </div>

              {/* Record Mode Overlay */}
              {recordingTarget && (
                <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20 rounded-2xl">
                  <div className="relative flex items-center justify-center w-16 h-16 mb-4">
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-75" />
                    <div className="w-10 h-10 rounded-full bg-primary/25 border border-primary flex items-center justify-center text-primary-text">
                      <Activity className="w-5 h-5 animate-pulse" />
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-100 uppercase tracking-wider mb-1">
                    Waiting for Input
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-xs mb-5 leading-relaxed">
                    Press any key on your keyboard to assign to{' '}
                    <span className="text-primary-text font-bold">
                      {recordingTarget.label}
                    </span>
                    .
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => setRecordingTarget(null)}
                    className="px-6 py-2 border-zinc-700/80 hover:border-zinc-500 text-zinc-300 hover:text-zinc-100"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </Card>

            {/* Key Bindings & Diagnostics Card */}
            <Card className="overflow-hidden p-0 h-[580px] flex flex-col space-y-0 border-border-main/70">
              <Tabs
                options={tabOptions}
                activeId={activeTab}
                onChange={setActiveTab}
              />

              <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
                {activeTab === 'bindings' ? (
                  <div className="space-y-4">
                    {/* Search Field */}
                    {active.mappings.length > 0 && (
                      <div className="flex items-center gap-2 rounded-xl border border-border-main/70 bg-zinc-950/40 px-3 py-2 transition-all focus-within:border-primary-border/80">
                        <Search className="w-4 h-4 text-zinc-500" />
                        <input
                          value={bindingsQuery}
                          onChange={(e) => setBindingsQuery(e.target.value)}
                          placeholder="Filter key bindings by input or key..."
                          className="flex-1 bg-transparent text-xs outline-none text-zinc-200"
                        />
                        {bindingsQuery && (
                          <button
                            onClick={() => setBindingsQuery('')}
                            className="text-zinc-500 hover:text-zinc-300 transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}

                    {active.mappings.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-border-main/50 rounded-xl bg-zinc-950/15">
                        <GamepadIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2.5" />
                        <p className="text-xs text-zinc-400 font-semibold">
                          No keybindings configured
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-1 max-w-[280px] mx-auto leading-relaxed">
                          Click any highlighted button on the gamepad canvas
                          above to bind it to a key.
                        </p>
                      </div>
                    ) : filteredMappings.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-xs text-zinc-500">
                          No matching bindings found for "{bindingsQuery}".
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-4 mb-1">
                          <div className="col-span-4">Gamepad Control</div>
                          <div className="col-span-1 text-center"></div>
                          <div className="col-span-4">Mapped Key</div>
                          <div className="col-span-2">Type</div>
                          <div className="col-span-1 text-right">Action</div>
                        </div>

                        {/* Mappings Rows */}
                        <div className="space-y-1.5">
                          {filteredMappings.map((map) => (
                            <div
                              key={`${active.name}-${map.button_id}`}
                              className="grid grid-cols-12 items-center bg-zinc-900/20 hover:bg-zinc-900/40 border border-border-main/40 hover:border-border-hover rounded-xl px-4 py-2.5 transition duration-150 group/row"
                            >
                              {/* Gamepad Input */}
                              <div className="col-span-4 flex items-center">
                                <span className="inline-flex items-center justify-center min-w-10 h-7 px-2.5 rounded-full bg-primary-bg border border-primary-border/80 text-primary-text font-bold text-[10px] uppercase shadow-sm">
                                  {buttonLabelMap[map.button_id] ||
                                    `Button ${map.button_id}`}
                                </span>
                              </div>

                              {/* Visual Connector */}
                              <div className="col-span-1 flex items-center justify-center">
                                <Zap className="w-3 h-3 text-zinc-600 group-hover/row:text-primary-text transition-colors duration-300" />
                              </div>

                              {/* Mapped Keyboard Keycap */}
                              <div className="col-span-4 flex items-center">
                                <kbd className="min-w-[32px] h-7 px-2.5 flex items-center justify-center rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-100 text-[10px] font-mono font-bold shadow-md shadow-black/60 uppercase">
                                  {map.key_str}
                                </kbd>
                              </div>

                              {/* Mapping Type Tag */}
                              <div className="col-span-2">
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-950 text-zinc-400 border border-border-main/40 uppercase tracking-wider">
                                  {map.mapping_type}
                                </span>
                              </div>

                              {/* Action Column */}
                              <div className="col-span-1 text-right">
                                <button
                                  onClick={() => onDeleteMapping(map.button_id)}
                                  className="text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all active:scale-95 cursor-pointer"
                                  title="Delete Mapping"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Terminal interface for logs */
                  <div className="flex flex-col rounded-xl border border-border-main/70 bg-zinc-950/70 overflow-hidden font-mono text-[11px] h-[510px]">
                    {/* Terminal Header */}
                    <div className="flex items-center justify-between bg-zinc-900/60 border-b border-border-main/70 px-4 py-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                        <span className="text-[9px] font-bold text-zinc-400 ml-2 tracking-wider flex items-center gap-1">
                          <Terminal className="w-3.5 h-3.5" />
                          <span>DAEMON_LOG_STREAM</span>
                        </span>
                      </div>
                      <button
                        onClick={() => setLogs([])}
                        className="text-[9px] font-bold text-zinc-400 hover:text-zinc-200 transition bg-zinc-900 border border-border-main px-2 py-0.5 rounded cursor-pointer"
                      >
                        Clear Logs
                      </button>
                    </div>

                    {/* Terminal Content */}
                    <div className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
                      {logs.length === 0 ? (
                        <div className="text-zinc-500 italic py-4 text-center">
                          No diagnostic logs captured yet. Press buttons to
                          test.
                        </div>
                      ) : (
                        logs.map((log, idx) => {
                          let logColor = 'text-zinc-400';
                          if (log.includes('pressed')) {
                            logColor = 'text-primary-text font-semibold';
                          } else if (log.includes('Remapped')) {
                            logColor = 'text-emerald-400';
                          } else if (log.includes('Auto-switched')) {
                            logColor = 'text-amber-400';
                          }

                          return (
                            <div
                              key={idx}
                              className={cn(
                                'transition-all duration-150 py-0.5',
                                logColor
                              )}
                            >
                              {log}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN: Profile details, target apps & connected gamepads */}
          <div className="lg:col-span-5 space-y-6">
            {/* Active Profile Configuration */}
            <Card className="flex flex-col gap-4 border-border-main/70 bg-bg-card">
              <div className="flex items-center justify-between border-b border-border-main/30 pb-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Profile Configuration
                </span>
                <span className="text-[10px] font-bold text-primary-text bg-primary-bg px-2 py-0.5 rounded-full border border-primary-border">
                  {active.name}
                </span>
              </div>

              {/* Selector and Main Actions */}
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400">
                    Select Profile
                  </label>
                  <div className="flex gap-2">
                    <Select
                      value={activeProfile}
                      onChange={setActiveProfile}
                      options={profiles.map((profile) => ({
                        value: profile.name,
                        label: profile.name
                      }))}
                      className="flex-1"
                    />

                    {/* Rename Toggle */}
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setIsRenaming(true);
                        setRenameValue(active.name);
                      }}
                      title="Rename Profile"
                      className="h-9 w-9 p-0 flex items-center justify-center rounded-xl"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>

                    {/* Delete Action */}
                    <Button
                      variant="destructive"
                      onClick={handleDeleteProfile}
                      disabled={profiles.length <= 1}
                      title="Delete Profile"
                      className="h-9 w-9 p-0 flex items-center justify-center rounded-xl"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Inline Rename Form */}
                {isRenaming && (
                  <div className="p-3 rounded-xl border border-primary-border bg-primary-bg/10 space-y-2 animate-fade-in">
                    <span className="text-[10px] font-bold text-primary-text uppercase tracking-wider">
                      Rename Profile
                    </span>
                    <div className="flex gap-2">
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="flex-1 rounded-lg bg-zinc-950/80 border border-border-main px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary"
                        placeholder="New profile name"
                        autoFocus
                      />
                      <Button
                        variant="primary"
                        onClick={onRenameProfile}
                        className="h-8 py-0 px-3 text-[10px]"
                      >
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setIsRenaming(false)}
                        className="h-8 py-0 px-3 text-[10px]"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Inline Create Profile Trigger/Form */}
                {!isCreatingProfile ? (
                  <Button
                    variant="secondary"
                    onClick={() => setIsCreatingProfile(true)}
                    className="w-full justify-center gap-1 py-2 text-xs border-dashed border-border-main/70 hover:border-zinc-500 hover:bg-zinc-900/10 text-zinc-300"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Profile</span>
                  </Button>
                ) : (
                  <div className="p-3 rounded-xl border border-border-main bg-zinc-900/20 space-y-2 animate-fade-in">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Create Profile
                    </span>
                    <div className="flex gap-2">
                      <input
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                        placeholder="Profile name..."
                        className="flex-1 rounded-lg bg-zinc-950/80 border border-border-main px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary"
                        autoFocus
                      />
                      <Button
                        variant="primary"
                        onClick={onCreateProfile}
                        className="h-8 py-0 px-3 text-[10px]"
                      >
                        Create
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setIsCreatingProfile(false)}
                        className="h-8 py-0 px-3 text-[10px]"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Slider Settings */}
              <div className="border-t border-border-main/30 pt-4 space-y-4">
                <Slider
                  label="Button Debounce Filter"
                  value={active.debounce_ms}
                  onChange={async (val) => {
                    await saveProfile({ ...active, debounce_ms: val });
                  }}
                  min={0}
                  max={100}
                  suffix="ms"
                  description="Filters hardware switch chatter on button activations to prevent double clicks."
                />

                <Slider
                  label="Joystick Deadzone"
                  value={Math.round((active.axis_deadzone ?? 0.12) * 100)}
                  onChange={async (val) => {
                    await saveProfile({ ...active, axis_deadzone: val / 100 });
                  }}
                  min={0}
                  max={50}
                  suffix="%"
                  description="Inner circular deadzone threshold for sticks to prevent stick drift."
                />
              </div>
            </Card>

            {/* Target Applications / Auto-Switching */}
            <Card className="flex flex-col gap-4 border-border-main/70 bg-bg-card">
              <div className="flex items-center justify-between border-b border-border-main/30 pb-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Target Applications
                </span>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsProcessDialogOpen(true);
                    setProcessQuery('');
                    loadProcesses('');
                  }}
                  className="py-1 px-2.5 h-7 rounded-lg text-[9px] font-bold"
                >
                  <Plus className="w-3 h-3 text-zinc-400" />
                  <span>Browse App</span>
                </Button>
              </div>

              {targetList.length === 0 ? (
                <div className="p-3 border border-dashed border-border-main/40 rounded-xl bg-zinc-950/10 text-center">
                  <p className="text-xs text-zinc-400 font-semibold">
                    Global Mode Active
                  </p>
                  <p className="text-[9px] text-zinc-500 mt-1 max-w-[220px] mx-auto leading-normal">
                    This profile applies globally. Bind a running EXE to enable
                    auto-profile switching.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] text-zinc-500">
                    This profile activates automatically when any of these
                    executables are focused:
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1 scrollbar-thin">
                    {targetList.map((target) => (
                      <span
                        key={target}
                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-semibold bg-zinc-950 border border-border-main/50 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition"
                      >
                        <span className="font-mono text-[10px]">{target}</span>
                        <button
                          onClick={() => onRemoveTarget(target)}
                          className="text-zinc-500 hover:text-red-400 p-0.5 rounded transition cursor-pointer"
                          title={`Remove ${target}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Controller Hardware Connection Status */}
            <Card className="flex flex-col gap-4 border-border-main/70 bg-bg-card">
              <div className="flex items-center justify-between border-b border-border-main/30 pb-2">
                <div className="flex items-center gap-1.5">
                  <GamepadIcon className="w-4 h-4 text-zinc-400" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    Hardware Status
                  </span>
                </div>
                <button
                  onClick={loadConnectedGamepads}
                  disabled={isLoadingGamepads}
                  className="text-zinc-500 hover:text-primary-text transition flex items-center gap-1 text-[10px] font-bold disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isLoadingGamepads ? 'animate-spin' : ''}`}
                  />
                  <span>Scan</span>
                </button>
              </div>

              {isLoadingGamepads ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                  <span className="text-xs text-zinc-500">
                    Scanning USB ports...
                  </span>
                </div>
              ) : connectedGamepads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-border-main/50 rounded-xl bg-zinc-950/15">
                  <p className="text-xs text-zinc-500 font-semibold">
                    No controller detected
                  </p>
                  <p className="text-[9px] text-zinc-600 mt-1 max-w-[200px] leading-normal">
                    Connect a controller via USB or Bluetooth and click Scan.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {connectedGamepads.map((pad) => (
                    <div
                      key={pad.id}
                      className="flex items-center justify-between text-xs text-zinc-300 rounded-xl border border-border-main/40 px-3 py-2 bg-zinc-950/20"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <div className="p-1 rounded-lg bg-zinc-900 border border-border-main/60">
                            <GamepadIcon className="w-3.5 h-3.5 text-zinc-400" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold truncate pr-1 text-zinc-200">
                            {pad.name}
                          </p>
                          <p className="text-[8px] text-zinc-500 font-mono truncate">
                            {pad.id}
                          </p>
                        </div>
                      </div>
                      <span className="text-[8px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </ContentLayout>

      <Dialog
        open={isProcessDialogOpen}
        onClose={() => setIsProcessDialogOpen(false)}
        title="Process Explorer"
        description="Select foreground game or application executables. System services and background processes are hidden."
        className="border-border-main/70"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl border border-border-main/70 bg-zinc-950/40 px-3 py-2 transition-all focus-within:border-primary-border/60">
            <Search className="w-4 h-4 text-zinc-500" />
            <input
              value={processQuery}
              onChange={(e) => setProcessQuery(e.target.value)}
              placeholder="Search executable name..."
              className="flex-1 bg-transparent text-xs outline-none text-zinc-200"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {isLoadingProcesses ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3.5" />
                <span className="text-xs text-zinc-500">
                  Retrieving active windows...
                </span>
              </div>
            ) : processes.length === 0 ? (
              <p className="text-xs text-zinc-500 py-10 text-center">
                No matching processes with visible windows found.
              </p>
            ) : (
              processes.map((proc) => {
                const added = targetList.includes(proc.exe_name.toLowerCase());
                return (
                  <div
                    key={`${proc.exe_name}-${proc.pid}`}
                    className="flex items-center justify-between rounded-xl border border-border-main/40 hover:border-border-hover px-4 py-2.5 bg-zinc-950/20 hover:bg-zinc-950/40 transition duration-150"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-zinc-900 border border-border-main/60">
                        <Activity className="w-3.5 h-3.5 text-zinc-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-200 truncate">
                          {proc.exe_name}
                        </p>
                        <p className="text-[9px] font-mono text-zinc-500">
                          PID: {proc.pid}
                        </p>
                      </div>
                    </div>
                    {added ? (
                      <Button
                        variant="destructive"
                        onClick={() =>
                          onRemoveTarget(proc.exe_name.toLowerCase())
                        }
                        className="py-1 px-3 h-8 rounded-lg text-[10px]"
                      >
                        Remove
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => onAddTarget(proc.exe_name.toLowerCase())}
                        className="py-1 px-3 h-8 rounded-lg text-[10px]"
                      >
                        Add App
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
