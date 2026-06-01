import { cn } from '@/lib/utils';
import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  description?: string;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  suffix = '',
  description,
  className
}) => {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex justify-between">
        <label className="text-xs font-semibold text-zinc-200">{label}</label>
        <span className="text-xs font-bold text-primary-text">
          {value} {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none accent-primary"
      />
      {description && (
        <p className="text-xs text-zinc-400 leading-normal">{description}</p>
      )}
    </div>
  );
};
