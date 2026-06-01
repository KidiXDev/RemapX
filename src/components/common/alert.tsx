import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X
} from 'lucide-react';
import React, { useState } from 'react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'destructive';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
  showIcon?: boolean;
}

const variantStyles: Record<
  AlertVariant,
  {
    container: string;
    icon: string;
    title: string;
    text: string;
    iconComponent: React.ComponentType<any>;
  }
> = {
  info: {
    container:
      'bg-primary-bg border-primary-border/60 text-zinc-300 shadow-lg shadow-primary-glow/5',
    icon: 'text-primary-text',
    title: 'text-primary-text font-bold',
    text: 'text-zinc-300',
    iconComponent: Info
  },
  success: {
    container:
      'bg-emerald-950/15 border-emerald-500/25 text-zinc-300 shadow-lg shadow-emerald-500/5',
    icon: 'text-emerald-400',
    title: 'text-emerald-400 font-bold',
    text: 'text-zinc-300',
    iconComponent: CheckCircle2
  },
  warning: {
    container:
      'bg-amber-950/15 border-amber-500/25 text-zinc-300 shadow-lg shadow-amber-500/5',
    icon: 'text-amber-400',
    title: 'text-amber-400 font-bold',
    text: 'text-zinc-300',
    iconComponent: AlertTriangle
  },
  destructive: {
    container:
      'bg-destructive-bg border-destructive-border/60 text-zinc-300 shadow-lg shadow-destructive-glow/5',
    icon: 'text-destructive-text',
    title: 'text-destructive-text font-bold',
    text: 'text-zinc-300',
    iconComponent: AlertCircle
  }
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onClose,
  className,
  showIcon = true
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const styles = variantStyles[variant];
  const Icon = styles.iconComponent;

  const handleDismiss = () => {
    setIsVisible(false);
    if (onClose) {
      // Call parent close hook after animation
      setTimeout(onClose, 200);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{
            opacity: 0,
            height: 0,
            marginTop: 0,
            marginBottom: 0,
            padding: 0,
            border: 0,
            transition: { duration: 0.2 }
          }}
          className={cn(
            'flex gap-3 rounded-2xl border px-4 py-3.5 text-xs transition-all duration-300 relative overflow-hidden backdrop-blur-sm',
            styles.container,
            className
          )}
        >
          {showIcon && (
            <div className={cn('shrink-0 mt-0.5', styles.icon)}>
              <Icon className="w-4 h-4" />
            </div>
          )}
          <div className="flex-1 space-y-1">
            {title && (
              <h5
                className={cn(
                  'text-xs font-bold leading-none uppercase tracking-wider',
                  styles.title
                )}
              >
                {title}
              </h5>
            )}
            <div className={cn('leading-relaxed font-medium', styles.text)}>
              {children}
            </div>
          </div>
          {onClose && (
            <button
              onClick={handleDismiss}
              className="shrink-0 text-zinc-400 hover:text-zinc-200 transition-colors p-1 -mr-1 -mt-1 rounded-lg hover:bg-zinc-800/30"
              aria-label="Close alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
