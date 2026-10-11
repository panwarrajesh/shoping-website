import { cn } from '../../utils/cn';

const tones = {
  green: 'bg-brand-50 text-brand-700',
  amber: 'bg-marigold-50 text-amber-700',
  gray: 'bg-surface-alt text-ink-soft',
  red: 'bg-red-50 text-danger',
};
export default function Badge({ tone = 'gray', className, children }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-semibold', tones[tone], className)}>{children}</span>;
}
