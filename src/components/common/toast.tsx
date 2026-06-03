import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toast: ((item: Omit<ToastItem, 'id'>) => void) & {
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    warning: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = item.duration ?? 4000;
    const newToast: ToastItem = { ...item, id, duration };

    setToasts((prev) => [...prev, newToast]);
  }, []);

  // Expose shortcut methods on the toast function
  const toastFn = useCallback((item: Omit<ToastItem, 'id'>) => {
    addToast(item);
  }, [addToast]) as ToastContextType['toast'];

  toastFn.success = useCallback((title: string, description?: string) => {
    addToast({ title, description, variant: 'success' });
  }, [addToast]);

  toastFn.error = useCallback((title: string, description?: string) => {
    addToast({ title, description, variant: 'error' });
  }, [addToast]);

  toastFn.warning = useCallback((title: string, description?: string) => {
    addToast({ title, description, variant: 'warning' });
  }, [addToast]);

  toastFn.info = useCallback((title: string, description?: string) => {
    addToast({ title, description, variant: 'info' });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast: toastFn, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <Toast key={t.id} item={t} onClose={() => removeToast(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
}

function Toast({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const { title, description, variant = 'info' } = item;

  const [isHovered, setIsHovered] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const remainingRef = useRef<number>(item.duration ?? 4000);

  useEffect(() => {
    if (isHovered) return;

    const timer = setTimeout(() => {
      onClose();
    }, remainingRef.current);

    startTimeRef.current = Date.now();

    return () => {
      clearTimeout(timer);
      const elapsed = Date.now() - startTimeRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    };
  }, [isHovered, onClose]);

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />,
    error: <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    info: <Info className="w-4 h-4 text-primary shrink-0" />
  };

  const borders = {
    success: 'border-l-2 border-l-emerald-500',
    error: 'border-l-2 border-l-red-500',
    warning: 'border-l-2 border-l-amber-500',
    info: 'border-l-2 border-l-primary'
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'w-full flex items-start gap-3 p-4 rounded-xl pointer-events-auto bg-zinc-950/80 border border-border-main/80 shadow-2xl backdrop-blur-md select-none',
        borders[variant]
      )}
    >
      {icons[variant]}
      <div className="flex-1 min-w-0">
        <h3 className="text-xs font-bold text-zinc-100 leading-tight">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-[11px] text-zinc-400 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5 rounded-lg hover:bg-white/5 cursor-pointer shrink-0"
        aria-label="Close notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
