import { Check, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatDateTime } from '../../utils/date';

// Vertical tracking timeline. Done steps are filled, the current one has a ring, cancelled orders end in red.
export default function OrderTimeline({ timeline }) {
  const { steps, current, cancelled } = timeline;
  return (
    <ol>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const isCancel = s.key === 'CANCELLED';
        const isCurrent = !cancelled && s.key === current && !(s.key === 'DELIVERED');
        return (
          <li key={s.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
                isCancel ? 'border-danger bg-danger text-white'
                  : s.done ? 'border-brand-600 bg-brand-600 text-white' : 'border-surface-line bg-white text-transparent',
                isCurrent && 'ring-4 ring-brand-100')}>
                {isCancel ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              </span>
              {!last && <span className={cn('my-1 w-0.5 flex-1 min-h-[20px]', s.done && steps[i + 1].done ? (steps[i + 1].key === 'CANCELLED' ? 'bg-danger' : 'bg-brand-600') : 'bg-surface-line')} />}
            </div>
            <div className={cn('min-w-0 pb-4', last && 'pb-0')}>
              <p className={cn('text-sm', s.done ? 'font-bold' : 'font-medium text-ink-mute', s.skipped && 'line-through opacity-60', isCancel && 'text-danger')}>{s.label}</p>
              {s.at && <p className="text-xs text-ink-mute">{formatDateTime(s.at)}</p>}
              {s.note && <p className="mt-0.5 text-xs text-ink-soft">{s.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
