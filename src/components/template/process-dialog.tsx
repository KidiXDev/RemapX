import { Button } from '@/components/common/button';
import { Dialog } from '@/components/common/dialog';
import { Input } from '@/components/common/input';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'use-debounce';

interface ActiveProcess {
  pid: number;
  exe_name: string;
}

interface ProcessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetList: string[];
  onAddTarget: (exeName: string) => void | Promise<void>;
  onRemoveTarget: (exeName: string) => void | Promise<void>;
}

export function ProcessDialog({
  isOpen,
  onClose,
  targetList,
  onAddTarget,
  onRemoveTarget
}: ProcessDialogProps) {
  const { t } = useTranslation('remap');
  const [processQuery, setProcessQuery] = useState('');
  const [debouncedProcessQuery] = useDebounce(processQuery, 250);

  const { data: processes = [], isLoading: isLoadingProcesses } = useQuery<
    ActiveProcess[]
  >({
    queryKey: ['active-processes', debouncedProcessQuery],
    queryFn: () =>
      invoke<ActiveProcess[]>('get_active_processes', {
        query: debouncedProcessQuery || null,
        limit: 200
      }),
    enabled: isOpen
  });

  const showProcessLoading = useDelayedLoading(isLoadingProcesses, 150);

  const getProcessBadge = (exeName: string) => {
    const clean = exeName.replace(/\.exe$/i, '').trim();
    return clean ? clean[0].toUpperCase() : '?';
  };

  const handleClose = () => {
    setProcessQuery('');
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      title={t('process.title')}
      description={t('process.description')}
      className="border-border-main/70"
    >
      <div className="space-y-4">
        <Input
          value={processQuery}
          onChange={(e) => setProcessQuery(e.target.value)}
          placeholder={t('process.searchPlaceholder')}
          leftIcon={<Search className="w-4 h-4 text-zinc-500" />}
        />

        <div className="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {showProcessLoading ? (
            <div className="flex items-center justify-center py-10 animate-fade-in">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3.5" />
              <span className="text-xs text-zinc-500">
                {t('process.loading')}
              </span>
            </div>
          ) : processes.length === 0 ? (
            <p className="text-xs text-zinc-500 py-10 text-center">
              {t('process.empty')}
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
                    <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-border-main/60 flex items-center justify-center text-[10px] font-bold text-zinc-200">
                      {getProcessBadge(proc.exe_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-200 truncate">
                        {proc.exe_name}
                      </p>
                      <p className="text-xs font-mono text-zinc-500">
                        {t('process.pidPrefix')} {proc.pid}
                      </p>
                    </div>
                  </div>
                  {added ? (
                    <Button
                      variant="destructive"
                      onClick={() =>
                        onRemoveTarget(proc.exe_name.toLowerCase())
                      }
                      className="py-1 px-3 h-8 rounded-lg text-xs"
                    >
                      {t('targets.remove')}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => onAddTarget(proc.exe_name.toLowerCase())}
                      className="py-1 px-3 h-8 rounded-lg text-xs"
                    >
                      {t('targets.addApp')}
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Dialog>
  );
}
