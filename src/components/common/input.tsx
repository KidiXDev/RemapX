import { cn } from '@/lib/utils';
import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      leftIcon,
      rightIcon,
      containerClassName,
      error,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const hasIcon = !!leftIcon || !!rightIcon;

    const inputElement = (
      <input
        ref={ref}
        type={type}
        className={cn(
          'w-full text-xs text-zinc-200 outline-none transition-colors placeholder:text-zinc-500 bg-transparent disabled:opacity-50 disabled:cursor-not-allowed',
          !hasIcon && [
            'rounded-lg bg-zinc-950/80 border px-3 py-2 focus:border-primary focus:outline-none',
            error ? 'border-red-500/80' : 'border-border-main'
          ],
          hasIcon &&
            'flex-1 min-w-0 bg-transparent border-0 px-0 py-0 focus:ring-0 focus:outline-none',
          className
        )}
        {...props}
      />
    );

    if (hasIcon) {
      return (
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border bg-zinc-950/40 px-3 py-2 transition-all focus-within:border-primary',
            error ? 'border-red-500/80' : 'border-border-main/70',
            containerClassName
          )}
        >
          {leftIcon}
          {inputElement}
          {rightIcon}
        </div>
      );
    }

    return inputElement;
  }
);

Input.displayName = 'Input';

export default Input;
