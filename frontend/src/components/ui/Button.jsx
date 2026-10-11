import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const variants = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-700',
  accent: 'bg-marigold-500 text-ink hover:bg-marigold-400 active:bg-marigold-400',
  outline: 'border border-surface-line bg-white text-ink hover:bg-surface-alt active:bg-surface-alt',
  ghost: 'text-brand-700 hover:bg-brand-50 active:bg-brand-100',
  danger: 'bg-danger text-white',
};
const sizes = { md: 'h-11 px-5 text-sm', lg: 'h-12 px-6 text-base' }; // 44px+ touch targets

export default function Button({ variant = 'primary', size = 'md', loading, full, className, children, ...rest }) {
  return (
    <button
      disabled={loading || rest.disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant], sizes[size], full && 'w-full', className
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
