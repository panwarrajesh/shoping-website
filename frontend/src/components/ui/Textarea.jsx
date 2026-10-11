import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Textarea = forwardRef(function Textarea({ label, error, hint, className, ...rest }, ref) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-semibold">{label}</span>}
      <textarea ref={ref} rows={3} className={cn(
        'w-full resize-none rounded-xl border bg-white px-4 py-3 text-ink placeholder:text-ink-mute',
        'focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100',
        error ? 'border-danger' : 'border-surface-line', className)} {...rest} />
      {error ? <span className="mt-1 block text-xs text-danger">{error}</span>
             : hint && <span className="mt-1 block text-xs text-ink-mute">{hint}</span>}
    </label>
  );
});
export default Textarea;
