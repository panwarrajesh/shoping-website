import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { cn } from '../../utils/cn';

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const remove = (id) => setItems((s) => s.filter((t) => t.id !== id));
  const push = useCallback((message, type) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, message, type }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3500);
  }, []);
  const toast = { success: (m) => push(m, 'success'), error: (m) => push(m, 'error') };

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 p-3 pt-safe">
        {items.map((t) => (
          <div key={t.id} className={cn(
            'pointer-events-auto flex w-full max-w-sm animate-up items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-sheet',
            t.type === 'error' ? 'bg-danger' : 'bg-ink')}>
            {t.type === 'error' ? <AlertCircle className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-500" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} aria-label="Close"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
