import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className
}: DialogProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div
        className={cn(
          'relative z-10 w-full max-w-2xl rounded-2xl border border-border-main bg-bg-card shadow-2xl',
          className
        )}
      >
        <div className="flex items-start justify-between border-b border-border-main px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-zinc-100">{title}</h2>
            {description ? (
              <p className="mt-1 text-xs text-zinc-400">{description}</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-100"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
