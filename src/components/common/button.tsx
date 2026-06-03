import { cn } from '@/lib/utils';
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'icon' | 'ghost' | 'destructive';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  className,
  ...props
}) => {
  return (
    <button
      className={cn(
        'flex items-center justify-center gap-1.5 transition-all duration-300 rounded-xl active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        variant === 'primary' &&
          'px-4 py-2 text-xs font-bold bg-primary hover:bg-primary-hover text-zinc-950 shadow-lg shadow-primary/10',
        variant === 'secondary' &&
          'px-4 py-2 text-xs font-bold bg-zinc-900 border border-border-main hover:border-border-hover text-zinc-300',
        variant === 'icon' &&
          'p-2.5 border border-border-main hover:border-border-hover text-zinc-300',
        variant === 'ghost' &&
          'text-zinc-400 hover:text-zinc-100 hover:bg-white/10 border-0',
        variant === 'destructive' &&
          'px-4 py-2 text-xs font-bold bg-destructive hover:bg-destructive-hover text-zinc-50 shadow-lg shadow-destructive/10',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  className,
  disabled
}) => {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        'w-9 h-5 rounded-full p-0.5 transition-all flex items-center',
        checked ? 'bg-primary' : 'bg-zinc-800',
        disabled && 'opacity-40 cursor-not-allowed',
        className
      )}
    >
      <div
        className={cn(
          'w-4 h-4 rounded-full bg-bg-main transition-transform duration-300 ease-out',
          checked ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  );
};
