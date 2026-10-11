import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const MobileInput = forwardRef(function MobileInput({ label = 'Mobile number', error, ...rest }, ref) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <div className={cn(
        'flex h-12 items-center overflow-hidden rounded-xl border bg-white focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100',
        error ? 'border-danger' : 'border-surface-line')}>
        <span className="flex h-full items-center border-r border-surface-line bg-surface-alt px-3 text-sm font-semibold text-ink-soft">+91</span>
        <input
          ref={ref} type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14}
          placeholder="10 digit mobile number"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-ink placeholder:text-ink-mute focus:outline-none"
          {...rest}
        />
      </div>
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
});
export default MobileInput;
