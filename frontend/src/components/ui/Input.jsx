import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

// Works with React Hook Form: <Input label="Mobile" {...register('mobile')} error={errors.mobile?.message} />
const Input = forwardRef(function Input({ label, error, hint, className, ...rest }, ref) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>}
      <input
        ref={ref}
        className={cn(
          'h-12 w-full rounded-xl border bg-white px-4 text-ink placeholder:text-ink-mute',
          'focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100',
          error ? 'border-danger' : 'border-surface-line', className
        )}
        {...rest}
      />
      {error ? <span className="mt-1 block text-xs text-danger">{error}</span>
             : hint && <span className="mt-1 block text-xs text-ink-mute">{hint}</span>}
    </label>
  );
});
export default Input;
