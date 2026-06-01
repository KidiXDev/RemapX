import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface TabOption<T extends string = string> {
  id: T;
  label: string;
}

interface TabsProps<T extends string = string> {
  options: TabOption<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
}

export function Tabs<T extends string = string>({
  options,
  activeId,
  onChange,
  className
}: TabsProps<T>) {
  return (
    <div
      className={cn(
        'flex border-b border-border-main bg-bg-header shrink-0',
        className
      )}
    >
      {options.map((option) => {
        const isActive = activeId === option.id;
        return (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={cn(
              'relative flex-1 py-3.5 text-xs font-bold transition-colors text-center focus:outline-none',
              isActive
                ? 'text-primary-text bg-primary-bg/5'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            <span className="relative z-10">{option.label}</span>
            {isActive && (
              <motion.div
                layoutId="active-tab-underline"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary-text z-0"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

