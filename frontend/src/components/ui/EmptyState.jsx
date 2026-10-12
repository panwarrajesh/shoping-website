export default function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Icon className="h-8 w-8" /></span>}
      <h2 className="text-base font-extrabold">{title}</h2>
      {text && <p className="mt-1 max-w-xs text-sm text-ink-soft">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
