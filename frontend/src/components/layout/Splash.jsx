import { Store, Loader2 } from 'lucide-react';

export default function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-600 text-white">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-brand-600"><Store className="h-9 w-9" /></span>
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}
