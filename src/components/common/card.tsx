import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "p-6 rounded-2xl bg-bg-card border border-border-main space-y-5",
        className
      )}
      {...props}
    >
      {title && (
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider border-b border-border-main/40 pb-2">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};
