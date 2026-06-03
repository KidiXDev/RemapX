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
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useDisclosure } from '@/hooks/use-disclosure';
import { Mapping, Profile, useSettingsStore } from '@/hooks/use-settings-store';
import { cn } from '@/lib/utils';
import { invoke } from '@tauri-apps/api/core';
import {
  Activity,
  Copy,
  Gamepad as GamepadIcon,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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

  const {
    gamepads: connectedGamepads,
    isLoading: isLoadingGamepads,
    refresh: loadConnectedGamepads
  } = useConnectedGamepads(1500);

  const showGamepadLoading = useDelayedLoading(isLoadingGamepads, 150);

  const [recordingTarget, setRecordingTarget] = useState<{
    buttonId: number;
    label: string;
  } | null>(null);

  const createDialog = useDisclosure(false);
  const renameDialog = useDisclosure(false);
  const duplicateDialog = useDisclosure(false);
  const processDialog = useDisclosure(false);

  const targetList = useMemo(
    () =>
      active.target_exe
        .split(/[,;\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    [active.target_exe]
  );

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

  return (
    <>
      <ContentLayout title={t('title')}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT/CENTER WORKSPACE COLUMN: Gamepad Canvas & Tabs */}
          <div className="lg:col-span-7 space-y-6 flex flex-col">
            {/* Gamepad Canvas Card */}
            <Card className="relative flex flex-col items-center justify-center p-6 border-border-main/70 bg-bg-card min-h-[380px] overflow-hidden">
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
            </Card>

            {/* Key Bindings & Diagnostics Card */}
            <Card className="overflow-hidden p-0 h-[580px] flex flex-col space-y-0 border-border-main/70">
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
                  <MappingsList
                    mappings={active.mappings}
                    onDeleteMapping={onDeleteMapping}
                    profileName={active.name}
                  />
                ) : (
                  <DiagnosticsTerminal />
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN: Profile details, target apps & connected gamepads */}
          <div className="lg:col-span-5 space-y-6">
            {/* Active Profile Configuration */}
            <Card className="flex flex-col gap-4 border-border-main/70 bg-bg-card">
              <div className="flex items-center justify-between border-b border-border-main/30">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  {t('profile.title')}
                </span>
                <span className="text-xs font-bold text-primary-text bg-primary-bg px-2 py-0.5 rounded-full border border-primary-border">
                  {active.name}
                </span>
              </div>

              {/* Selector and Main Actions */}
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400">
                    {t('profile.selectLabel')}
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
                      onClick={renameDialog.onOpen}
                      title={t('profile.renameTitle')}
                      className="h-9 w-9 p-0 flex items-center justify-center rounded-xl"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>

                    {/* Duplicate Action */}
                    <Button
                      variant="secondary"
                      onClick={duplicateDialog.onOpen}
                      title={t('profile.duplicate')}
                      className="h-9 w-9 p-0 flex items-center justify-center rounded-xl"
                    >
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    </Button>

                    {/* Delete Action */}
                    <Button
                      variant="destructive"
                      onClick={handleDeleteProfile}
                      disabled={profiles.length <= 1}
                      title={t('profile.renamePromptTitle')}
                      className="h-9 w-9 p-0 flex items-center justify-center rounded-xl"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Create Profile Trigger Button */}
                <Button
                  variant="secondary"
                  onClick={createDialog.onOpen}
                  className="w-full justify-center gap-1 py-2 text-xs border-dashed border-border-main/70 hover:border-zinc-500 hover:bg-zinc-900/10 text-zinc-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('profile.createTrigger')}</span>
                </Button>
              </div>

              {/* Profile Slider Settings */}
              <div className="border-t border-border-main/30 pt-4 space-y-4">
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
                  value={Math.round((active.axis_deadzone ?? 0.0) * 100)}
                  onChange={async (val) => {
                    await saveProfile({ ...active, axis_deadzone: val / 100 });
                  }}
                  min={0}
                  max={50}
                  suffix="%"
                  description={t('profile.deadzoneDesc')}
                />
              </div>
            </Card>

            {/* Target Applications / Auto-Switching */}
            <Card className="flex flex-col gap-4 border-border-main/70 bg-bg-card">
              <div className="flex items-center justify-between border-b border-border-main/30 pb-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  {t('targets.title')}
                </span>
                <Button
                  variant="secondary"
                  onClick={processDialog.onOpen}
                  className="py-1 px-2.5 h-7 rounded-lg text-xs font-bold"
                >
                  <Plus className="w-3 h-3 text-zinc-400" />
                  <span>{t('targets.browseApp')}</span>
                </Button>
              </div>

              {targetList.length === 0 ? (
                <div className="p-3 border border-dashed border-border-main/40 rounded-xl bg-zinc-950/10 text-center">
                  <p className="text-xs py-4 text-zinc-400 font-semibold">
                    {t('targets.globalTitle')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500">
                    {t('targets.listDesc')}
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1 scrollbar-thin">
                    {targetList.map((target) => (
                      <span
                        key={target}
                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-semibold bg-zinc-950 border border-border-main/50 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition"
                      >
                        <span className="font-mono text-xs">{target}</span>
                        <button
                          onClick={() => onRemoveTarget(target)}
                          className="text-zinc-500 hover:text-red-400 p-0.5 rounded transition cursor-pointer"
                          title={`${t('targets.remove')} ${target}`}
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
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    {t('hardware.title')}
                  </span>
                </div>
                <button
                  onClick={() => {
                    void loadConnectedGamepads();
                  }}
                  disabled={isLoadingGamepads}
                  className="text-zinc-500 hover:text-primary-text transition flex items-center gap-1 text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isLoadingGamepads ? 'animate-spin' : ''}`}
                  />
                  <span>{t('hardware.scan')}</span>
                </button>
              </div>

              {showGamepadLoading ? (
                <div className="flex items-center justify-center py-6 animate-fade-in">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                  <span className="text-xs text-zinc-500">
                    {t('hardware.scanning')}
                  </span>
                </div>
              ) : connectedGamepads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-border-main/50 rounded-xl bg-zinc-950/15">
                  <p className="text-xs text-zinc-500 font-semibold">
                    {t('hardware.emptyTitle')}
                  </p>
                  <p className="text-xs text-zinc-600 mt-1 max-w-[200px] leading-normal">
                    {t('hardware.emptyDesc')}
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
                          <p className="text-xs text-zinc-500 font-mono truncate">
                            {pad.id}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase">
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
