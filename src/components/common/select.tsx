import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface SelectOption<T = string> {
  value: T;
  label: string;
}

interface SelectProps<T = string> {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  placeholder?: string;
}

export function Select<T extends string = string>({
  options,
  value,
  onChange,
  className,
  placeholder = 'Select...'
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full rounded-xl bg-zinc-950/60 border border-border-main hover:border-border-hover transition px-3.5 py-2 text-xs font-semibold text-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary text-left cursor-pointer h-9"
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ml-2',
            isOpen && 'rotate-180 text-primary-text'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute z-50 w-full mt-1.5 rounded-xl border border-border-main bg-zinc-950 shadow-2xl overflow-hidden py-1 max-h-60 overflow-y-auto scrollbar-thin"
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex items-center justify-between w-full px-3.5 py-2.5 text-xs text-left transition cursor-pointer',
                    isSelected
                      ? 'bg-primary-bg/15 text-primary-text font-bold'
                      : 'text-zinc-300 hover:bg-zinc-900/60 hover:text-zinc-100'
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-primary-text shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Select;
