import { useRef } from 'react';
import { cn } from '../../utils/cn';

// 6 big boxes. Supports paste, backspace navigation and SMS autofill (iOS/Android).
export default function OtpInput({ value, onChange, onComplete, length = 6, error, autoFocus }) {
  const refs = useRef([]);
  const focus = (i) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const update = (v) => {
    onChange(v);
    if (v.length === length) onComplete?.(v);
  };

  const handleChange = (i, raw) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return;
    if (digits.length > 1) { // autofill / paste into a single box
      const v = digits.slice(0, length);
      update(v);
      focus(v.length);
      return;
    }
    update((value.slice(0, i) + digits + value.slice(i + 1)).slice(0, length));
    focus(i + 1);
  };

  const handleKey = (i, e) => {
    if (e.key !== 'Backspace') return;
    e.preventDefault();
    if (value[i]) update(value.slice(0, i) + value.slice(i + 1));
    else { update(value.slice(0, Math.max(0, i - 1)) + value.slice(i)); focus(i - 1); }
  };

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="One time password">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          autoFocus={autoFocus && i === 0}
          aria-label={`Digit ${i + 1}`}
          className={cn(
            'h-14 w-full min-w-0 rounded-xl border bg-white text-center text-2xl font-bold text-ink',
            'focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100',
            error ? 'border-danger' : 'border-surface-line'
          )}
        />
      ))}
    </div>
  );
}
