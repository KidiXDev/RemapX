import { cn } from '@/lib/utils';
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'icon';
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
        'flex items-center justify-center gap-1.5 transition-all duration-300 rounded-xl active:scale-[0.98]',
        variant === 'primary' &&
          'px-4 py-2 text-xs font-bold bg-primary hover:bg-primary-hover text-zinc-950 shadow-lg shadow-primary/10',
        variant === 'secondary' &&
          'px-4 py-2 text-xs font-bold bg-zinc-900 border border-border-main hover:border-border-hover text-zinc-300',
        variant === 'icon' &&
          'p-2.5 border border-border-main hover:border-border-hover text-zinc-300',
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
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  className
}) => {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'w-9 h-5 rounded-full p-0.5 transition-all flex items-center',
        checked ? 'bg-primary' : 'bg-zinc-800',
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
