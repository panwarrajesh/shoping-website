import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

const PasswordInput = forwardRef(function PasswordInput({ label = 'Password', error, hint, autoComplete = 'current-password', ...rest }, ref) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <div className="relative">
        <input
          ref={ref} type={show ? 'text' : 'password'} autoComplete={autoComplete}
          className={cn(
            'h-12 w-full rounded-xl border bg-white pl-4 pr-12 text-ink placeholder:text-ink-mute',
            'focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100',
            error ? 'border-danger' : 'border-surface-line')}
          {...rest}
        />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-ink-mute">
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      {error ? <span className="mt-1 block text-xs text-danger">{error}</span>
             : hint && <span className="mt-1 block text-xs text-ink-mute">{hint}</span>}
    </label>
  );
});
export default PasswordInput;
