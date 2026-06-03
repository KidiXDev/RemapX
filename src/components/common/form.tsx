import { cn } from '@/lib/utils';
import { FieldApi } from '@tanstack/react-form';
import { AnimatePresence, motion } from 'framer-motion';
import React, { createContext, useContext, useId } from 'react';
import { z } from 'zod';
import { Input } from './input';
import { Select } from './select';
import { Slider } from './slider';

// ============================================================================
// Types
// ============================================================================

export type AnyFieldApi = FieldApi<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>;

// ============================================================================
// Contexts
// ============================================================================

const FormFieldContext = createContext<AnyFieldApi | null>(null);

type FormItemContextValue = {
  id: string;
};

const FormItemContext = createContext<FormItemContextValue | null>(null);

// ============================================================================
// Helpers & Hooks
// ============================================================================

/**
 * Extracts a error message from standard string errors or Standard Schema/Zod issue objects.
 */
export const getErrorMessage = (error: unknown): string | undefined => {
  if (!error) return undefined;
  if (typeof error === 'object' && error !== null) {
    if ('message' in error) {
      return (error as { message: string }).message;
    }
  }
  return String(error);
};

/**
 * Hook to retrieve field metadata and handlers inside form components.
 */
export function useFormField() {
  const fieldContext = useContext(FormFieldContext);
  const itemContext = useContext(FormItemContext);

  if (!fieldContext) {
    throw new Error('useFormField must be used within a FormFieldProvider');
  }

  const id = itemContext?.id || '';
  
  // Show error if field is touched OR form is submitted/has submission attempts
  const isTouched = fieldContext.state.meta.isTouched;
  const isSubmitted = fieldContext.form.state.submissionAttempts > 0;
  
  const rawError = (isTouched || isSubmitted) ? fieldContext.state.meta.errors?.[0] : undefined;
  const error = getErrorMessage(rawError);

  return {
    id,
    name: fieldContext.name,
    error,
    isTouched,
    isValidating: fieldContext.state.meta.isValidating,
    field: fieldContext,
  };
}

/**
 * Custom Zod validator helper for field-level validations.
 * Returns a string error message directly for simpler integration.
 */
export function zodValidate(schema: z.ZodTypeAny) {
  return ({ value }: { value: unknown }) => {
    const result = schema.safeParse(value);
    if (!result.success) {
      return result.error.issues[0]?.message;
    }
    return undefined;
  };
}

/**
 * Custom Zod validator helper for form-level validations.
 * Validates the entire form state schema and maps fields to error messages.
 */
export function zodFormValidate<T>(schema: z.ZodType<T>) {
  return ({ value }: { value: T }) => {
    const result = schema.safeParse(value);
    if (result.success) {
      return undefined;
    }
    const fieldErrors: Record<string, string> = {};
    result.error.issues.forEach((err) => {
      const path = err.path.join('.');
      if (path && !fieldErrors[path]) {
        fieldErrors[path] = err.message;
      }
    });
    return fieldErrors;
  };
}

// ============================================================================
// Core Form Components
// ============================================================================

/**
 * Wraps a TanStack form field renderer to provide react context to sub-components.
 */
export function FormFieldProvider({
  field,
  children,
}: {
  field: AnyFieldApi;
  children: React.ReactNode;
}) {
  return (
    <FormFieldContext.Provider value={field}>
      {children}
    </FormFieldContext.Provider>
  );
}

/**
 * FormItem provides unique IDs for input-label coupling and consistent layout.
 */
export function FormItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const id = useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div className={cn('flex flex-col w-full', className)}>{children}</div>
    </FormItemContext.Provider>
  );
}

/**
 * FormLabel renders standard label styling synced with the input ID.
 */
export function FormLabel({
  children,
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  const { id, error } = useFormField();

  return (
    <label
      htmlFor={id}
      className={cn(
        'block text-xs font-semibold select-none transition-colors duration-150 mb-2',
        error ? 'text-red-400' : 'text-zinc-300',
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}

/**
 * FormControl automatically injects input ID, value, change/blur events, and error state.
 */
export function FormControl({ children }: { children: React.ReactElement<any> }) {
  const { id, field, error } = useFormField();

  return React.cloneElement(children, {
    id,
    value: field.state.value ?? '',
    onChange: (e: any) => {
      // Handle standard inputs/textareas (e.target.value) or raw input components
      const val = e?.target ? e.target.value : e;
      field.handleChange(val);
    },
    onBlur: field.handleBlur,
    error: !!error || (children.props as any).error,
    'aria-describedby': `${id}-description`,
    'aria-invalid': !!error,
  });
}

/**
 * FormDescription displays secondary helper text.
 */
export function FormDescription({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const { id } = useFormField();

  return (
    <p
      id={`${id}-description`}
      className={cn('text-xs text-zinc-500 leading-normal mt-1.5', className)}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * FormMessage renders field-level errors with a premium slide/fade animation.
 */
export function FormMessage({ className }: { className?: string }) {
  const { error } = useFormField();

  return (
    <AnimatePresence mode="wait">
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={cn('text-[11px] font-semibold text-red-400 mt-1.5', className)}
        >
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Shorthand Shorthands (Saves code redundancy for common inputs)
// ============================================================================

interface FormInputProps extends Omit<React.ComponentProps<typeof Input>, 'name'> {
  form: any;
  name: string;
  label?: string;
  description?: string;
  validators?: any;
}

export function FormInput({
  form,
  name,
  label,
  description,
  validators,
  ...props
}: FormInputProps) {
  return (
    <form.Field
      name={name}
      validators={validators}
      children={(field: AnyFieldApi) => (
        <FormFieldProvider field={field}>
          <FormItem>
            {label && <FormLabel>{label}</FormLabel>}
            <FormControl>
              <Input {...props} />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        </FormFieldProvider>
      )}
    />
  );
}

interface FormSelectProps<T extends string = string> {
  form: any;
  name: string;
  label?: string;
  description?: string;
  options: { value: T; label: string }[];
  placeholder?: string;
  validators?: any;
  className?: string;
}

export function FormSelect<T extends string = string>({
  form,
  name,
  label,
  description,
  options,
  placeholder,
  validators,
  className,
}: FormSelectProps<T>) {
  return (
    <form.Field
      name={name}
      validators={validators}
      children={(field: AnyFieldApi) => (
        <FormFieldProvider field={field}>
          <FormItem>
            {label && <FormLabel>{label}</FormLabel>}
            <FormControl>
              <Select
                options={options}
                placeholder={placeholder}
                className={className}
                value={field.state.value}
                onChange={field.handleChange}
              />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        </FormFieldProvider>
      )}
    />
  );
}

interface FormSliderProps {
  form: any;
  name: string;
  label: string;
  description?: string;
  min?: number;
  max?: number;
  suffix?: string;
  validators?: any;
  className?: string;
}

export function FormSlider({
  form,
  name,
  label,
  description,
  min,
  max,
  suffix,
  validators,
  className,
}: FormSliderProps) {
  return (
    <form.Field
      name={name}
      validators={validators}
      children={(field: AnyFieldApi) => (
        <FormFieldProvider field={field}>
          <FormItem>
            <FormControl>
              <Slider
                label={label}
                min={min}
                max={max}
                suffix={suffix}
                className={className}
                value={field.state.value ?? 0}
                onChange={field.handleChange}
              />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        </FormFieldProvider>
      )}
    />
  );
}
