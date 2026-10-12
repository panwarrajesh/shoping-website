import { forwardRef } from 'react';

const Switch = forwardRef(function Switch({ label, hint, ...rest }, ref) {
  return (
    <label className="flex min-h-[56px] cursor-pointer items-center justify-between gap-4 rounded-xl border border-surface-line bg-white px-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-ink-mute">{hint}</span>}
      </span>
      <span className="relative inline-flex h-7 w-12 shrink-0">
        <input ref={ref} type="checkbox" className="peer sr-only" {...rest} />
        <span className="absolute inset-0 rounded-full bg-surface-line transition-colors peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-100" />
        <span className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
});
export default Switch;
