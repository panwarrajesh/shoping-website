import { Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { UserPlus, MapPin, PackagePlus, Home, Users, ShieldCheck, Wallet } from 'lucide-react';
import Button from '../../components/ui/Button';

const steps = [
  { icon: UserPlus, title: 'Account banao', text: 'Mobile number se 2 minute mein seller account.' },
  { icon: MapPin, title: 'Area chuno', text: 'Batao kahan tak delivery karoge: 5, 10 ya 50 km.' },
  { icon: PackagePlus, title: 'Products jodo', text: 'Asli photos ke saath product daalo aur becho.' },
];
const perks = [
  { icon: Home, title: 'Ghar se business', text: 'Sirf phone chahiye. Dukaan ya office ki zaroorat nahi.' },
  { icon: Users, title: 'Apne area ke customers', text: 'Aapke paas ke log seedhe aapke products dekhte hain.' },
  { icon: ShieldCheck, title: 'Verified Seller badge', text: 'Verification ke baad customers ka bharosa badhta hai.' },
  { icon: Wallet, title: 'Seedha settlement', text: 'Delivery ke baad paise aapke bank account mein.' },
];

export default function SellerLanding() {
  const user = useSelector((s) => s.auth.user);
  if (user?.role === 'SELLER') return <Navigate to="/seller/dashboard" replace />;

  const cta = user
    ? <Link to="/seller/register"><Button size="lg" variant="accent" className="w-full sm:w-auto">Seller banna shuru karo</Button></Link>
    : <Link to="/login" state={{ from: { pathname: '/seller/register' } }}><Button size="lg" variant="accent" className="w-full sm:w-auto">Login karke shuru karo</Button></Link>;

  return (
    <div className="space-y-8 lg:space-y-12">
      <section className="rounded-card bg-brand-600 p-6 text-white lg:p-12">
        <h1 className="max-w-xl text-2xl font-extrabold leading-tight lg:text-4xl">Apne ghar se business shuru karo, apne area mein becho</h1>
        <p className="mt-3 max-w-xl text-white/85">LocalMart par apne products daalo aur paas ke customers tak pahucho.</p>
        <div className="mt-6">{cta}</div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-extrabold">3 aasan steps</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="rounded-card bg-white p-5 shadow-card">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-6 w-6" /></span>
              <p className="mt-3 text-xs font-bold text-brand-700">STEP {i + 1}</p>
              <h3 className="text-base font-extrabold">{title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-extrabold">Seller ko kya milta hai</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {perks.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3 rounded-card bg-white p-4 shadow-card">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-marigold-50 text-amber-700"><Icon className="h-5 w-5" /></span>
              <div><h3 className="text-sm font-extrabold">{title}</h3><p className="mt-0.5 text-sm text-ink-soft">{text}</p></div>
            </div>
          ))}
        </div>
      </section>

      <p className="text-center text-xs text-ink-mute">Registration ke liye PAN aur bank account chahiye. Commission category ke hisaab se alag hoti hai.</p>
    </div>
  );
}
