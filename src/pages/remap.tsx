import { Button } from '@/components/common/button';
import { Card } from '@/components/common/card';
import { Select } from '@/components/common/select';
import { Slider } from '@/components/common/slider';
import { Tabs } from '@/components/common/tabs';
import { useToast } from '@/components/common/toast';
import { ContentLayout } from '@/components/layout/content-layout';
import { useConfirm } from '@/components/providers/confirmation-provider';
import { DiagnosticsTerminal } from '@/components/template/diagnostics-terminal';
import { Gamepad } from '@/components/template/gamepad';
import { MappingsList } from '@/components/template/mappings-list';
import { ProcessDialog } from '@/components/template/process-dialog';
import { ProfileDialogs } from '@/components/template/profile-dialogs';
import { useConnectedGamepads } from '@/hooks/use-connected-gamepads';
import { useDisclosure } from '@/hooks/use-disclosure';
import { Mapping, Profile, useSettingsStore } from '@/hooks/use-settings-store';
import {
  decodeAnalogKeyboardConfig,
  decodeMouseMoveConfig,
  DEFAULT_ANALOG_KEYBOARD_CONFIG,
  DEFAULT_MOUSE_MOVE_CONFIG,
  encodeAnalogKeyboardConfig,
  encodeMouseMoveConfig,
  LEFT_STICK_MOTION_ID,
  RIGHT_STICK_MOTION_ID,
  StickMappingMode
} from '@/lib/mapping-utils';
import { cn } from '@/lib/utils';
import { invoke } from '@tauri-apps/api/core';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ChevronDown,
  Copy,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Sliders,
  Trash2,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ConnectedGamepad {
  id: string;
  name: string;
}

type TabType = 'bindings' | 'live';

const EMPTY_PROFILE: Profile = {
  name: 'Default',
  debounce_ms: 8,
  axis_deadzone: 0.0,
  target_exe: '',
  mappings: []
};

export function Remap() {
  const { t } = useTranslation('remap');
  const {
    profiles,
    activeProfile,
    setActiveProfile,
    saveProfile,
    deleteProfile
  } = useSettingsStore();

  const confirm = useConfirm();
  const toast = useToast();

  const active = useMemo(
    () =>
      profiles.find((profile) => profile.name === activeProfile) ??
      EMPTY_PROFILE,
    [profiles, activeProfile]
  );

  const handleDeleteProfile = async () => {
    const confirmed = await confirm({
      title: t('profile.renamePromptTitle'),
      description: `${t('profile.renamePromptDescPrefix')} "${active.name}"${t('profile.renamePromptDescSuffix')}`,
      confirmText: t('profile.deleteConfirm'),
      cancelText: t('profile.cancel'),
      variant: 'destructive'
    });
    if (confirmed) {
      try {
        const deletedName = active.name;
        await deleteProfile(deletedName);
        toast.success(t('profile.toastDeleteSuccess'));
      } catch (err) {
        console.error(err);
        toast.error(t('profile.toastDeleteError'));
      }
    }
  };

  const [activeTab, setActiveTab] = useState<TabType>('bindings');
  const [engineRunning, setEngineRunning] = useState(false);
  const [selectedStickId, setSelectedStickId] = useState<number | null>(null);
  const previousGamepadsRef = useRef<ConnectedGamepad[] | null>(null);

  const {
    gamepads: connectedGamepads,
    isLoading: isLoadingGamepads,
    refresh: loadConnectedGamepads
  } = useConnectedGamepads(1500);

  const [recordingTarget, setRecordingTarget] = useState<{
    buttonId: number;
    label: string;
  } | null>(null);

  const [recordingStickDirection, setRecordingStickDirection] = useState<{
    stickId: number;
    direction: 'up' | 'left' | 'down' | 'right';
  } | null>(null);

  const createDialog = useDisclosure(false);
  const renameDialog = useDisclosure(false);
  const duplicateDialog = useDisclosure(false);
  const processDialog = useDisclosure(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setSettingsOpen(false);
      }
    }
    if (menuOpen || settingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen, settingsOpen]);

  const targetList = useMemo(
    () =>
      active.target_exe
        .split(/[,;\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    [active.target_exe]
  );

  const leftStickMapping = useMemo(
    () =>
      active.mappings.find(
        (mapping) => mapping.button_id === LEFT_STICK_MOTION_ID
      ),
    [active.mappings]
  );
  const rightStickMapping = useMemo(
    () =>
      active.mappings.find(
        (mapping) => mapping.button_id === RIGHT_STICK_MOTION_ID
      ),
    [active.mappings]
  );

  const leftStickMode = leftStickMapping
    ? leftStickMapping.mapping_type === 'AnalogKeyboard'
      ? 'keyboard'
      : leftStickMapping.mapping_type === 'MouseMove'
        ? 'mouse'
        : 'off'
    : 'off';
  const rightStickMode = rightStickMapping
    ? rightStickMapping.mapping_type === 'AnalogKeyboard'
      ? 'keyboard'
      : rightStickMapping.mapping_type === 'MouseMove'
        ? 'mouse'
        : 'off'
    : 'off';

  const leftKeyboardConfig = leftStickMapping
    ? decodeAnalogKeyboardConfig(leftStickMapping.key_str)
    : DEFAULT_ANALOG_KEYBOARD_CONFIG;
  const rightKeyboardConfig = rightStickMapping
    ? decodeAnalogKeyboardConfig(rightStickMapping.key_str)
    : DEFAULT_ANALOG_KEYBOARD_CONFIG;
  const leftMouseConfig = leftStickMapping
    ? decodeMouseMoveConfig(leftStickMapping.key_str)
    : DEFAULT_MOUSE_MOVE_CONFIG;
  const rightMouseConfig = rightStickMapping
    ? decodeMouseMoveConfig(rightStickMapping.key_str)
    : DEFAULT_MOUSE_MOVE_CONFIG;

  useEffect(() => {
    const initEngine = async () => {
      try {
        const pads = await invoke<ConnectedGamepad[]>('get_connected_gamepads');
        if (pads.length === 0) return;
        await invoke('start_engine');
        setEngineRunning(true);
      } catch (err) {
        console.error('Failed to auto-start engine', err);
      }
    };

    void initEngine();

    return () => {
      invoke('stop_engine').catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (connectedGamepads.length > 0 || !engineRunning) return;

    invoke('stop_engine')
      .then(() => setEngineRunning(false))
      .catch((err) =>
        console.error(
          'Failed to auto-stop engine when no gamepad is connected',
          err
        )
      );
  }, [connectedGamepads, engineRunning]);

  useEffect(() => {
    if (isLoadingGamepads) return;

    const previousGamepads = previousGamepadsRef.current;
    previousGamepadsRef.current = connectedGamepads;

    if (!previousGamepads) return;

    const previousById = new Map(
      previousGamepads.map((gamepad) => [gamepad.id, gamepad])
    );
    const currentById = new Map(
      connectedGamepads.map((gamepad) => [gamepad.id, gamepad])
    );

    for (const gamepad of connectedGamepads) {
      if (!previousById.has(gamepad.id)) {
        toast.info(
          t('hardware.toastConnectedTitle'),
          t('hardware.toastConnectedDescription', { name: gamepad.name })
        );
      }
    }

    for (const gamepad of previousGamepads) {
      if (!currentById.has(gamepad.id)) {
        toast.warning(
          t('hardware.toastDisconnectedTitle'),
          t('hardware.toastDisconnectedDescription', { name: gamepad.name })
        );
      }
    }
  }, [connectedGamepads, isLoadingGamepads, t, toast]);

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

      window.dispatchEvent(
        new CustomEvent('engine-log-add', {
          detail: `${t('logs.remappedPrefix')} ${recordingTarget.label} ${t('logs.to')} ${keyStr}`
        })
      );
      setRecordingTarget(null);
    };

    window.addEventListener('keydown', onKeyDown, { once: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [recordingTarget, active, saveProfile, t]);

  const tabOptions = [
    {
      id: 'bindings' as TabType,
      label: `${t('tabs.bindings')} (${active.mappings.length})`
    },
    { id: 'live' as TabType, label: t('tabs.diagnostics') }
  ];

  const onToggleEngine = async () => {
    if (!engineRunning) {
      if (connectedGamepads.length === 0) return;
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

  const upsertMapping = async (nextMapping: Mapping) => {
    const nextMappings = active.mappings.filter(
      (item) => item.button_id !== nextMapping.button_id
    );
    nextMappings.push(nextMapping);
    nextMappings.sort((a, b) => a.button_id - b.button_id);
    await saveProfile({ ...active, mappings: nextMappings });
  };

  const updateStickMode = async (
    buttonId: number,
    mode: StickMappingMode,
    defaults: {
      keyboard: typeof DEFAULT_ANALOG_KEYBOARD_CONFIG;
      mouse: typeof DEFAULT_MOUSE_MOVE_CONFIG;
    }
  ) => {
    if (mode === 'off') {
      await onDeleteMapping(buttonId);
      return;
    }

    if (mode === 'keyboard') {
      await upsertMapping({
        button_id: buttonId,
        key_str: encodeAnalogKeyboardConfig(defaults.keyboard),
        mapping_type: 'AnalogKeyboard'
      });
      return;
    }

    await upsertMapping({
      button_id: buttonId,
      key_str: encodeMouseMoveConfig(defaults.mouse),
      mapping_type: 'MouseMove'
    });
  };

  const updateAnalogKeyboardKey = async (
    buttonId: number,
    config: typeof DEFAULT_ANALOG_KEYBOARD_CONFIG,
    key: 'up' | 'left' | 'down' | 'right',
    value: string
  ) => {
    await upsertMapping({
      button_id: buttonId,
      key_str: encodeAnalogKeyboardConfig({
        ...config,
        [key]: value.trim().toUpperCase()
      }),
      mapping_type: 'AnalogKeyboard'
    });
  };

  const updateMouseSensitivity = async (buttonId: number, value: number) => {
    await upsertMapping({
      button_id: buttonId,
      key_str: encodeMouseMoveConfig({
        sensitivity: Math.min(50, Math.max(1, value))
      }),
      mapping_type: 'MouseMove'
    });
  };

  useEffect(() => {
    if (!recordingStickDirection) return;

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

      const { stickId, direction } = recordingStickDirection;
      const motionId =
        stickId === 11 ? LEFT_STICK_MOTION_ID : RIGHT_STICK_MOTION_ID;
      const currentConfig =
        stickId === 11 ? leftKeyboardConfig : rightKeyboardConfig;

      await updateAnalogKeyboardKey(motionId, currentConfig, direction, keyStr);

      window.dispatchEvent(
        new CustomEvent('engine-log-add', {
          detail: `${t('logs.remappedPrefix')} ${stickId === 11 ? 'Left Stick' : 'Right Stick'} ${direction.toUpperCase()} ${t('logs.to')} ${keyStr}`
        })
      );
      setRecordingStickDirection(null);
    };

    window.addEventListener('keydown', onKeyDown, { once: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [
    recordingStickDirection,
    active,
    leftKeyboardConfig,
    rightKeyboardConfig,
    t
  ]);

  return (
    <>
      <ContentLayout title={t('title')}>
        <div className="flex flex-col">
          {/* Top Control Panel */}
          <Card className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 px-4 border-border-main/70 bg-bg-card mb-6 overflow-visible space-y-3 sm:space-y-0 gap-3 min-h-[56px]">
            {/* Left: Profile Selector, Actions, & Settings Popover */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest shrink-0">
                  Profile
                </span>
                <Select
                  value={activeProfile}
                  onChange={setActiveProfile}
                  options={profiles.map((profile) => ({
                    value: profile.name,
                    label: profile.name
                  }))}
                  className="w-48"
                />
              </div>

              {/* More Actions Dropdown Menu */}
              <div ref={menuRef} className="relative">
                <Button
                  variant="secondary"
                  onClick={() => setMenuOpen(!menuOpen)}
                  title={t('profile.title')}
                  className={cn(
                    'h-9 w-9 p-0 flex items-center justify-center rounded-xl border transition-all duration-200',
                    menuOpen
                      ? 'bg-zinc-800 text-white border-zinc-500'
                      : 'border-border-main hover:border-border-hover'
                  )}
                >
                  <MoreVertical className="w-4 h-4 text-zinc-400" />
                </Button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.12, ease: 'easeOut' }}
                      className="absolute left-0 z-50 w-52 mt-1.5 rounded-xl border border-border-main bg-zinc-950 shadow-2xl py-1 overflow-hidden"
                    >
                      {/* Create New Profile */}
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          createDialog.onOpen();
                        }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-left text-zinc-300 hover:bg-zinc-900/60 hover:text-zinc-100 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{t('profile.createTrigger')}</span>
                      </button>

                      {/* Rename Profile */}
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          renameDialog.onOpen();
                        }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-left text-zinc-300 hover:bg-zinc-900/60 hover:text-zinc-100 transition cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{t('profile.renameTitle')}</span>
                      </button>

                      {/* Duplicate Profile */}
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          duplicateDialog.onOpen();
                        }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-left text-zinc-300 hover:bg-zinc-900/60 hover:text-zinc-100 transition cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{t('profile.duplicate')}</span>
                      </button>

                      <div className="h-px bg-border-main/55 my-1" />

                      {/* Delete Profile */}
                      <button
                        type="button"
                        disabled={profiles.length <= 1}
                        onClick={() => {
                          setMenuOpen(false);
                          handleDeleteProfile();
                        }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-left text-red-400/90 hover:bg-red-950/20 hover:text-red-300 disabled:opacity-50 disabled:pointer-events-none transition cursor-pointer font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400/70" />
                        <span>{t('profile.deleteConfirm')}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="w-px h-5 bg-border-main/50 mx-1 shrink-0 hidden sm:block" />

              {/* Tuning & Targets Settings popover */}
              <div ref={settingsRef} className="relative shrink-0">
                <Button
                  variant="secondary"
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className={cn(
                    'h-9 px-3.5 flex items-center gap-2 rounded-xl border transition-all duration-200 text-xs font-semibold w-full sm:w-auto',
                    settingsOpen
                      ? 'bg-zinc-800 text-white border-zinc-500'
                      : 'border-border-main hover:border-border-hover text-zinc-300'
                  )}
                >
                  <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Configure Settings</span>
                  <ChevronDown
                    className={cn(
                      'w-3 h-3 text-zinc-400 transition-transform duration-200 ml-0.5',
                      settingsOpen && 'rotate-180'
                    )}
                  />
                </Button>

                <AnimatePresence>
                  {settingsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute left-0 z-50 w-[350px] mt-2 rounded-2xl border border-border-main bg-zinc-950 shadow-2xl p-5 space-y-5"
                    >
                      {/* Debounce & Deadzone Sliders */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider border-b border-border-main/30 pb-2">
                          Tuning
                        </h4>
                        <Slider
                          label={t('profile.debounceLabel')}
                          value={active.debounce_ms}
                          onChange={async (val) => {
                            await saveProfile({ ...active, debounce_ms: val });
                          }}
                          min={0}
                          max={100}
                          suffix="ms"
                          description={t('profile.debounceDesc')}
                        />
                        <Slider
                          label={t('profile.deadzoneLabel')}
                          value={Math.round(
                            (active.axis_deadzone ?? 0.0) * 100
                          )}
                          onChange={async (val) => {
                            await saveProfile({
                              ...active,
                              axis_deadzone: val / 100
                            });
                          }}
                          min={0}
                          max={50}
                          suffix="%"
                          description={t('profile.deadzoneDesc')}
                        />
                      </div>

                      {/* Target Applications list */}
                      <div className="space-y-3.5 pt-1">
                        <div className="flex items-center justify-between border-b border-border-main/30 pb-2">
                          <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                            {t('targets.title')}
                          </h4>
                          <Button
                            variant="secondary"
                            onClick={processDialog.onOpen}
                            className="py-1 px-2 h-6.5 rounded-lg text-[10px] font-bold border border-border-main hover:border-border-hover shrink-0"
                          >
                            <Plus className="w-3 h-3 text-zinc-400 mr-1" />
                            <span>{t('targets.browseApp')}</span>
                          </Button>
                        </div>

                        {targetList.length === 0 ? (
                          <div className="p-3 border border-dashed border-border-main/40 rounded-xl bg-zinc-900/20 text-center">
                            <p className="text-[10px] text-zinc-500 font-semibold leading-relaxed">
                              {t('targets.globalTitle')}
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1 scrollbar-thin">
                            {targetList.map((target) => (
                              <span
                                key={target}
                                className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-lg text-[10px] font-semibold bg-zinc-900 border border-border-main/50 text-zinc-300 hover:border-zinc-500 transition duration-150"
                              >
                                <span className="font-mono text-[10px]">
                                  {target}
                                </span>
                                <button
                                  onClick={() => onRemoveTarget(target)}
                                  className="text-zinc-500 hover:text-red-400 p-0.5 rounded transition cursor-pointer"
                                  title={`${t('targets.remove')} ${target}`}
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right: Controller Hardware Connection Status */}
            <div className="flex items-center gap-2 border border-border-main/40 bg-zinc-950/20 px-3 py-1 h-9 rounded-xl shrink-0 self-start sm:self-auto">
              <div className="relative flex items-center">
                {connectedGamepads.length > 0 ? (
                  <span className="flex h-2 w-2 relative mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-zinc-600 mr-2" />
                )}
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1.5">
                  Device:
                </span>
                <span className="text-xs font-semibold text-zinc-200 truncate max-w-[160px]">
                  {connectedGamepads.length === 0
                    ? t('hardware.emptyTitle')
                    : connectedGamepads[0].name}
                </span>
              </div>

              <div className="w-px h-3.5 bg-border-main/50 mx-1 shrink-0" />

              <button
                onClick={() => {
                  void loadConnectedGamepads();
                }}
                disabled={isLoadingGamepads}
                className="text-zinc-500 hover:text-zinc-300 transition disabled:opacity-50 cursor-pointer shrink-0 p-0.5"
                title={t('hardware.scan')}
              >
                <RefreshCw
                  className={cn('w-3 h-3', isLoadingGamepads && 'animate-spin')}
                />
              </button>
            </div>
          </Card>

          {/* Main Side-by-Side Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Gamepad Canvas Card */}
            <Card className="lg:col-span-7 relative flex flex-col items-center justify-center p-6 border-border-main/70 bg-bg-card h-[580px] overflow-hidden space-y-0">
              {/* Start/Stop Engine Button */}
              <div className="absolute top-4 right-4 z-10">
                <Button
                  variant="secondary"
                  onClick={onToggleEngine}
                  disabled={!engineRunning && connectedGamepads.length === 0}
                  title={engineRunning ? t('engine.stop') : t('engine.start')}
                  className={cn(
                    'h-9 w-9 p-0 flex items-center justify-center rounded-xl border transition-all duration-300 shadow-md',
                    engineRunning
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 shadow-emerald-500/5'
                      : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 shadow-red-500/5'
                  )}
                >
                  {engineRunning ? (
                    <Pause className="w-4 h-4 animate-pulse" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="w-full flex justify-center py-4">
                <Gamepad
                  onButtonPress={() => {}}
                  mappings={active.mappings}
                  onControlSelect={(buttonId, label) => {
                    if (buttonId === 11 || buttonId === 12) {
                      setSelectedStickId(buttonId);
                    } else {
                      setRecordingTarget({ buttonId, label });
                    }
                  }}
                  engineRunning={engineRunning}
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
                    {t('record.title')}
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-xs mb-5 leading-relaxed">
                    {t('record.descriptionPrefix')}{' '}
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
                    {t('record.cancel')}
                  </Button>
                </div>
              )}

              {/* Stick Configuration Overlay */}
              {selectedStickId !== null && (
                <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in z-20 rounded-2xl">
                  <div className="w-full max-w-sm bg-zinc-900 border border-border-main/80 rounded-2xl p-5 text-left shadow-2xl space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-border-main/30">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-primary" />
                        <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                          {selectedStickId === 11
                            ? 'Left Stick Settings'
                            : 'Right Stick Settings'}
                        </h3>
                      </div>
                      <button
                        onClick={() => setSelectedStickId(null)}
                        className="text-zinc-400 hover:text-zinc-200 transition cursor-pointer p-0.5 rounded-lg hover:bg-zinc-800"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Stick Click (L3 / R3 Button) Section */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                        Stick Button (Click)
                      </span>
                      <div className="flex items-center justify-between bg-zinc-950/60 border border-border-main/40 rounded-xl p-2.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">
                            Current Mapping
                          </span>
                          <span className="font-mono text-xs font-bold text-zinc-200">
                            {(() => {
                              const clickMapping = active.mappings.find(
                                (m) => m.button_id === selectedStickId
                              );
                              return clickMapping
                                ? clickMapping.key_str
                                : 'UNMAPPED';
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {active.mappings.some(
                            (m) => m.button_id === selectedStickId
                          ) && (
                            <Button
                              variant="secondary"
                              className="p-0 h-8 w-8 text-red-400 hover:text-red-300 border-red-500/10 hover:border-red-500/30 hover:bg-red-500/5 rounded-lg transition"
                              onClick={() => {
                                void onDeleteMapping(selectedStickId);
                              }}
                              title="Remove binding"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            className="px-3 h-8 text-[11px] font-bold hover:border-zinc-500 rounded-lg transition"
                            onClick={() => {
                              const label =
                                selectedStickId === 11
                                  ? 'Left Stick Click'
                                  : 'Right Stick Click';
                              const id = selectedStickId;
                              setSelectedStickId(null);
                              setRecordingTarget({ buttonId: id, label });
                            }}
                          >
                            <Pencil className="w-3 h-3 mr-1.5" />
                            Rebind
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Stick Motion Mode Section */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                        Stick Motion Mapping
                      </span>
                      <div className="space-y-3 bg-zinc-950/60 border border-border-main/40 rounded-xl p-3">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">
                            Motion Mode
                          </span>
                          <Select
                            value={
                              selectedStickId === 11
                                ? leftStickMode
                                : rightStickMode
                            }
                            onChange={(mode) => {
                              const motionId =
                                selectedStickId === 11
                                  ? LEFT_STICK_MOTION_ID
                                  : RIGHT_STICK_MOTION_ID;
                              const currentKeyboardConfig =
                                selectedStickId === 11
                                  ? leftKeyboardConfig
                                  : rightKeyboardConfig;
                              const currentMouseConfig =
                                selectedStickId === 11
                                  ? leftMouseConfig
                                  : rightMouseConfig;
                              void updateStickMode(motionId, mode, {
                                keyboard: currentKeyboardConfig,
                                mouse: currentMouseConfig
                              });
                            }}
                            options={[
                              { value: 'off', label: 'Off' },
                              {
                                value: 'keyboard',
                                label: 'Keyboard Movement (WASD)'
                              },
                              { value: 'mouse', label: 'Mouse Movement (Look)' }
                            ]}
                          />
                        </div>

                        {/* Keyboard config inputs */}
                        {(selectedStickId === 11
                          ? leftStickMode
                          : rightStickMode) === 'keyboard' && (
                          <div className="space-y-2 pt-1 border-t border-border-main/20">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">
                              Directions
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              {(
                                [
                                  ['up', 'Up'],
                                  ['left', 'Left'],
                                  ['down', 'Down'],
                                  ['right', 'Right']
                                ] as const
                              ).map(([key, label]) => {
                                const motionId =
                                  selectedStickId === 11
                                    ? LEFT_STICK_MOTION_ID
                                    : RIGHT_STICK_MOTION_ID;
                                const currentConfig =
                                  selectedStickId === 11
                                    ? leftKeyboardConfig
                                    : rightKeyboardConfig;
                                const currentVal = currentConfig[key];
                                const isRecordingThisDirection =
                                  recordingStickDirection?.stickId ===
                                    selectedStickId &&
                                  recordingStickDirection?.direction === key;

                                return (
                                  <div key={key} className="space-y-1 block">
                                    <span className="text-[9px] text-zinc-500 font-semibold uppercase">
                                      {label}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <Button
                                        variant="secondary"
                                        onClick={() =>
                                          setRecordingStickDirection({
                                            stickId: selectedStickId,
                                            direction: key
                                          })
                                        }
                                        className={cn(
                                          'flex-1 h-8 px-2.5 font-mono text-xs font-bold rounded-lg border text-center transition',
                                          isRecordingThisDirection
                                            ? 'border-primary bg-primary/10 text-primary-text animate-pulse'
                                            : currentVal === 'NONE'
                                              ? 'border-dashed border-border-main/50 text-zinc-500 hover:border-zinc-400 bg-zinc-950/20'
                                              : 'border-border-main hover:border-zinc-500 text-zinc-200 bg-zinc-950/40'
                                        )}
                                      >
                                        {isRecordingThisDirection
                                          ? 'Press Key...'
                                          : currentVal === 'NONE'
                                            ? 'Unmapped'
                                            : currentVal}
                                      </Button>
                                      {currentVal !== 'NONE' && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void updateAnalogKeyboardKey(
                                              motionId,
                                              currentConfig,
                                              key,
                                              'NONE'
                                            )
                                          }
                                          className="p-1 h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-border-main/40 hover:border-red-500/25 rounded-lg transition shrink-0 cursor-pointer"
                                          title="Unmap direction"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Mouse config sensitivity */}
                        {(selectedStickId === 11
                          ? leftStickMode
                          : rightStickMode) === 'mouse' && (
                          <div className="space-y-2 pt-1 border-t border-border-main/20">
                            <Slider
                              label="Sensitivity"
                              min={1}
                              max={50}
                              value={
                                (selectedStickId === 11
                                  ? leftMouseConfig
                                  : rightMouseConfig
                                ).sensitivity
                              }
                              onChange={(value) => {
                                const motionId =
                                  selectedStickId === 11
                                    ? LEFT_STICK_MOTION_ID
                                    : RIGHT_STICK_MOTION_ID;
                                void updateMouseSensitivity(motionId, value);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end pt-1">
                      <Button
                        variant="secondary"
                        onClick={() => setSelectedStickId(null)}
                        className="px-4 py-1.5 hover:border-zinc-500 text-zinc-300 hover:text-zinc-100 rounded-lg text-xs font-semibold"
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Key Bindings & Diagnostics Card */}
            <Card className="lg:col-span-5 overflow-hidden p-0 h-[580px] flex flex-col space-y-0 border-border-main/70 bg-bg-card">
              <Tabs
                options={tabOptions}
                activeId={activeTab}
                onChange={setActiveTab}
              />

              <div
                className={cn(
                  'flex-1 p-5',
                  activeTab === 'bindings'
                    ? 'overflow-y-auto scrollbar-thin'
                    : 'overflow-hidden flex flex-col'
                )}
              >
                {activeTab === 'bindings' ? (
                  <div className="space-y-5">
                    <MappingsList
                      mappings={active.mappings}
                      onDeleteMapping={onDeleteMapping}
                      profileName={active.name}
                    />
                  </div>
                ) : (
                  <DiagnosticsTerminal />
                )}
              </div>
            </Card>
          </div>
        </div>
      </ContentLayout>

      <ProcessDialog
        isOpen={processDialog.isOpen}
        onClose={processDialog.onClose}
        targetList={targetList}
        onAddTarget={onAddTarget}
        onRemoveTarget={onRemoveTarget}
      />

      <ProfileDialogs
        createDisclosure={createDialog}
        renameDisclosure={renameDialog}
        duplicateDisclosure={duplicateDialog}
        activeProfileName={active.name}
      />
    </>
  );
}

export default Remap;
