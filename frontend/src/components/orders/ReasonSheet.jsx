import { useEffect, useState } from 'react';
import BottomSheet from '../ui/BottomSheet';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';

// Asks WHY before cancelling. Pick a ready reason or write your own.
export default function ReasonSheet({ open, title, reasons, confirmText = 'Cancel karo', loading, onSubmit, onClose }) {
  const [choice, setChoice] = useState('');
  const [other, setOther] = useState('');
  useEffect(() => { if (open) { setChoice(''); setOther(''); } }, [open]);
  const reason = choice === 'Other' ? other.trim() : choice;
  const valid = reason.length >= 3;

  return (
    <BottomSheet open={open} onClose={onClose} title={title}
      footer={<div className="grid grid-cols-2 gap-3">
        <Button variant="outline" size="lg" onClick={onClose} disabled={loading}>Wapas</Button>
        <Button variant="danger" size="lg" loading={loading} disabled={!valid} onClick={() => onSubmit(reason)}>{confirmText}</Button>
      </div>}>
      <div className="space-y-2 pt-1">
        {[...reasons, 'Other'].map((r) => (
          <label key={r} className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border border-surface-line px-3">
            <input type="radio" name="reason" checked={choice === r} onChange={() => setChoice(r)} className="h-5 w-5 accent-brand-600" />
            <span className="text-sm font-semibold">{r === 'Other' ? 'Kuch aur' : r}</span>
          </label>
        ))}
        {choice === 'Other' && <Textarea placeholder="Reason likho" maxLength={200} value={other} onChange={(e) => setOther(e.target.value)} />}
      </div>
    </BottomSheet>
  );
}
