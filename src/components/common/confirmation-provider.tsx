import { AlertTriangle, HelpCircle, Info } from 'lucide-react';
import React, { createContext, useContext, useRef, useState } from 'react';
import { Button } from './button';
import { Dialog } from './dialog';

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'destructive' | 'secondary';
}

type ConfirmationContextType = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmationContext = createContext<ConfirmationContextType | null>(null);

export const ConfirmationProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  };

  const handleClose = (value: boolean) => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(value);
      resolveRef.current = null;
    }
  };

  // Determine icon based on variant
  const getIcon = () => {
    if (!options) return null;
    switch (options.variant) {
      case 'destructive':
        return <AlertTriangle className="w-5 h-5 text-destructive-text" />;
      case 'secondary':
        return <Info className="w-5 h-5 text-zinc-400" />;
      default:
        return <HelpCircle className="w-5 h-5 text-primary-text" />;
    }
  };

  const getIconContainerClass = () => {
    if (!options) return '';
    switch (options.variant) {
      case 'destructive':
        return 'bg-destructive-bg border border-destructive-border/60';
      case 'secondary':
        return 'bg-zinc-900 border border-border-main';
      default:
        return 'bg-primary-bg border border-primary-border/60';
    }
  };

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      <Dialog
        open={isOpen}
        onClose={() => handleClose(false)}
        title={options?.title || 'Confirm Action'}
        className="max-w-md border-border-main/70 bg-zinc-950/80 backdrop-blur-xl"
      >
        <div className="space-y-6">
          <div className="flex gap-4 items-start">
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getIconContainerClass()}`}
            >
              {getIcon()}
            </div>
            <div className="flex-1 pt-1.5">
              <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                {options?.description}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border-main/20 pt-4">
            <Button
              variant="secondary"
              onClick={() => handleClose(false)}
              className="px-4 py-2 text-xs font-bold"
            >
              {options?.cancelText || 'Cancel'}
            </Button>
            <Button
              variant={options?.variant || 'primary'}
              onClick={() => handleClose(true)}
              className="px-4 py-2 text-xs font-bold"
              autoFocus
            >
              {options?.confirmText || 'Confirm'}
            </Button>
          </div>
        </div>
      </Dialog>
    </ConfirmationContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmationProvider');
  }
  return context;
};
