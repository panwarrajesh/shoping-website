import BottomSheet from './BottomSheet';
import Button from './Button';

export default function ConfirmDialog({ open, title, message, confirmText = 'Haan', danger, loading, onConfirm, onClose }) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" onClick={onClose} disabled={loading}>Nahi</Button>
          <Button variant={danger ? 'danger' : 'primary'} size="lg" loading={loading} onClick={onConfirm}>{confirmText}</Button>
        </div>}>
      <p className="text-sm text-ink-soft">{message}</p>
    </BottomSheet>
  );
}
