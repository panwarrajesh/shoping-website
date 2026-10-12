import { ArrowLeft, Store, BadgeCheck, MapPin, Wallet } from 'lucide-react';

const points = [
  { icon: MapPin, text: 'Apne area ke sellers, jaldi delivery' },
  { icon: BadgeCheck, text: 'Verified sellers aur asli product photos' },
  { icon: Wallet, text: 'UPI, card ya Cash on Delivery' },
];

export default function AuthLayout({ title, subtitle, onBack, children }) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-600 lg:flex-row lg:bg-white">
      <aside className="px-6 pb-12 pt-safe text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:bg-brand-600 lg:px-20 lg:pb-0">
        <div className="pt-6 lg:pt-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-600"><Store className="h-6 w-6" /></span>
            <span className="text-2xl font-extrabold tracking-tight">LocalMart</span>
          </div>
          <p className="mt-4 max-w-sm text-base font-medium leading-snug text-white/90 lg:mt-10 lg:text-3xl lg:font-extrabold lg:leading-tight">
            Apne area ke sellers se products kharido, aur ghar se business shuru karo.
          </p>
          <ul className="mt-8 hidden space-y-4 lg:block">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/90">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><Icon className="h-5 w-5" /></span>{text}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="-mt-6 flex-1 rounded-t-3xl bg-white px-5 pb-10 pt-7 lg:mt-0 lg:flex lg:items-center lg:justify-center lg:rounded-none">
        <div className="mx-auto w-full max-w-md animate-up">
          {onBack && (
            <button onClick={onBack} aria-label="Back" className="-ml-2 mb-3 flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-surface-alt">
              <ArrowLeft className="h-6 w-6" />
            </button>
          )}
          <h1 className="text-2xl font-extrabold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
