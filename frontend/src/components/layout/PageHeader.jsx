import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Back button + title for inner pages (feels like a native app screen on phones)
export default function PageHeader({ title, action, backTo }) {
  const navigate = useNavigate();
  return (
    <div className="mb-4 flex items-center gap-1">
      <button onClick={() => (backTo ? navigate(backTo) : navigate(-1))} aria-label="Back"
        className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-alt">
        <ArrowLeft className="h-6 w-6" />
      </button>
      <h1 className="flex-1 truncate text-xl font-extrabold">{title}</h1>
      {action}
    </div>
  );
}
