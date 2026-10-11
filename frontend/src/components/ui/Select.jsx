import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

const Select = forwardRef(function Select({ label, error, children, ...rest }, ref) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-semibold">{label}</span>}
      <div className="relative">
        <select ref={ref} className={cn(
          'h-12 w-full appearance-none rounded-xl border bg-white pl-4 pr-10 text-ink',
          'focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100',
          error ? 'border-danger' : 'border-surface-line')} {...rest}>{children}</select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-mute" />
      </div>
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
});
export default Select;
