import { Button } from '@/components/common/button';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  ArrowLeft,
  Gamepad2,
  Settings as SettingsIcon,
  X
} from 'lucide-react';
import { type MouseEvent } from 'react';
import { Link } from 'react-router';

interface TitlebarProps {
  isSettingsPage: boolean;
}

export function Titlebar({ isSettingsPage }: TitlebarProps) {
  const canUseTauriWindow =
    typeof window !== 'undefined' &&
    '__TAURI_INTERNALS__' in (window as object);

  const onClose = async () => {
    if (!canUseTauriWindow) return;
    await getCurrentWindow().close();
  };

  const onTitlebarMouseDown = async (event: MouseEvent<HTMLDivElement>) => {
    if (!canUseTauriWindow || event.button !== 0) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-no-drag]')) {
      return;
    }

    await getCurrentWindow().startDragging();
  };

  return (
    <div
      onMouseDown={onTitlebarMouseDown}
      className="h-10 border-b border-border-main bg-bg-header/85 backdrop-blur-md flex items-center justify-between pl-3 pr-0 z-30 shrink-0 select-none"
    >
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-linear-to-tr from-primary to-primary-hover flex items-center justify-center">
          <Gamepad2 className="w-3 h-3 text-zinc-950" />
        </div>
        <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-zinc-200">
          RemapX
        </span>
      </div>

      <div data-no-drag className="flex items-stretch h-full">
        <div className="flex items-center pr-2">
          {!isSettingsPage ? (
            <Link to="/settings" data-no-drag>
              <Button variant="ghost" className="h-7 w-7 p-0 rounded-lg">
                <SettingsIcon className="size-4" strokeWidth={1.5} />
              </Button>
            </Link>
          ) : (
            <Link to="/" data-no-drag>
              <Button variant="ghost" className="h-7 w-7 p-0 rounded-lg">
                <ArrowLeft className="size-4" strokeWidth={1.5} />
              </Button>
            </Link>
          )}
        </div>

        <div className="w-px mx-1 bg-border-main my-2.5" />

        <div className="flex items-stretch h-full">
          <button
            className="w-12 h-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-red-700 active:bg-red-700/80 transition-colors duration-100"
            onClick={onClose}
          >
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
