import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Check } from 'lucide-react';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';
import LocationFields from '../../components/seller/LocationFields';
import DeliveryFields from '../../components/seller/DeliveryFields';
import { useToast } from '../../components/ui/Toast';
import { sellerService } from '../../services/sellerService';
import { setUser } from '../../store/authSlice';
import { rupee } from '../../utils/cn';

const STEPS = ['Business', 'Location', 'Payout & KYC', 'Confirm'];
const STEP_FIELDS = [
  ['businessName', 'description'],
  ['addressLine', 'area', 'pincode', 'city', 'state', 'radiusKm', 'deliveryCharge', 'freeDeliveryAbove', 'etaDays'],
  ['panNumber', 'gstin', 'accountName', 'accountNumber', 'confirmAccountNumber', 'ifsc', 'upiId'],
  ['acceptTerms'],
];
const stepOf = (field) => Math.max(0, STEP_FIELDS.findIndex((s) => s.includes(field)));
const numOrUndef = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? undefined : Number(v));

export default function SellerRegister() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const topRef = useRef(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const form = useForm({
    mode: 'onTouched',
    defaultValues: { radiusKm: 10, deliveryCharge: 0, etaDays: 2, codAvailable: true, acceptTerms: false },
  });
  const { register, trigger, getValues, setError, handleSubmit, formState: { errors } } = form;

  if (user?.role === 'SELLER') return <Navigate to="/seller/dashboard" replace />;
  if (user?.role === 'ADMIN') return <Navigate to="/" replace />;

  const go = (n) => { setStep(n); topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const next = async () => { if (await trigger(STEP_FIELDS[step])) go(step + 1); };

  const submit = async (d) => {
    setLoading(true);
    const lat = getValues('latitude'); const lng = getValues('longitude');
    try {
      const res = await sellerService.register({
        businessName: d.businessName, description: d.description || undefined,
        addressLine: d.addressLine, area: d.area || undefined, city: d.city, state: d.state, pincode: d.pincode,
        latitude: numOrUndef(lat), longitude: numOrUndef(lng),
        radiusKm: Number(d.radiusKm), deliveryCharge: Number(d.deliveryCharge || 0),
        freeDeliveryAbove: numOrUndef(d.freeDeliveryAbove), codAvailable: Boolean(d.codAvailable), etaDays: Number(d.etaDays),
        panNumber: d.panNumber, gstin: d.gstin || '', accountName: d.accountName, accountNumber: d.accountNumber,
        ifsc: d.ifsc, upiId: d.upiId || '', acceptTerms: Boolean(d.acceptTerms),
      });
      dispatch(setUser(res.user)); // role is now SELLER
      toast.success('Seller account ban gaya!');
      navigate('/seller/dashboard', { replace: true });
    } catch (e) {
      if (e.code === 'SELLER_EXISTS') { toast.error(e.message); navigate('/seller/dashboard', { replace: true }); }
      else if (e.fields) {
        const entries = Object.entries(e.fields);
        entries.forEach(([k, m]) => setError(k, { message: m[0] }));
        go(Math.min(...entries.map(([k]) => stepOf(k))));
        toast.error('Kuch details theek karo');
      } else toast.error(e.message);
    } finally { setLoading(false); }
  };

  const d = getValues();
  const upperTest = (re, msg) => (v) => re.test(String(v || '').trim().toUpperCase()) || msg;

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="sticky top-0 z-30 border-b border-surface-line bg-white pt-safe">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-3">
          <button onClick={() => (step === 0 ? navigate(-1) : go(step - 1))} aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-alt"><ArrowLeft className="h-6 w-6" /></button>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">Seller registration</p><p className="text-xs text-ink-mute">Step {step + 1}/4 · {STEPS[step]}</p></div>
        </div>
        <div className="h-1 bg-surface-line"><div className="h-full bg-brand-600 transition-all" style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-32 pt-5 md:pb-10">
        <div ref={topRef} />
        <form id="seller-register" onSubmit={handleSubmit(submit)} noValidate className="rounded-card md:bg-white md:p-6 md:shadow-card">
          <section hidden={step !== 0} className="space-y-4">
            <h1 className="text-xl font-extrabold">Apne business ke baare mein batao</h1>
            <Input label="Business / Dukaan ka naam" placeholder="Jaise: Ravi Shoes" autoComplete="organization"
              {...register('businessName', { required: 'Business ka naam daalo', minLength: { value: 3, message: 'Kam se kam 3 akshar' } })} error={errors.businessName?.message} />
            <Textarea label="Business ke baare mein (optional)" placeholder="Aap kya bechte ho?" maxLength={500} {...register('description')} error={errors.description?.message} />
            <p className="rounded-xl bg-brand-50 p-3 text-xs text-brand-700">Logo aur product photos aap next step ke baad upload kar paoge.</p>
          </section>

          <section hidden={step !== 1} className="space-y-6">
            <h1 className="text-xl font-extrabold">Kahan se bechoge?</h1>
            <LocationFields form={form} />
            <div><h2 className="mb-3 text-base font-extrabold">Delivery settings</h2><DeliveryFields form={form} city={d.city} /></div>
          </section>

          <section hidden={step !== 2} className="space-y-4">
            <h1 className="text-xl font-extrabold">Payment aur KYC details</h1>
            <p className="text-sm text-ink-soft">Yeh details sirf paise bhejne aur verification ke liye hain. Hum inhe safe (encrypted) rakhte hain.</p>
            <Input label="PAN number" autoCapitalize="characters" maxLength={10} placeholder="ABCDE1234F"
              {...register('panNumber', { required: 'PAN number daalo', validate: upperTest(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Sahi PAN daalo (jaise ABCDE1234F)') })} error={errors.panNumber?.message} />
            <Input label="GST number (optional)" autoCapitalize="characters" maxLength={15}
              {...register('gstin', { validate: (v) => !v || /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v.trim().toUpperCase()) || 'Sahi 15 akshar ka GSTIN daalo' })} error={errors.gstin?.message} />
            <hr className="border-surface-line" />
            <Input label="Account holder ka naam" autoComplete="off" {...register('accountName', { required: 'Naam daalo', minLength: { value: 2, message: 'Naam bahut chhota hai' } })} error={errors.accountName?.message} />
            <Input label="Bank account number" inputMode="numeric" autoComplete="off" maxLength={18}
              {...register('accountNumber', { required: 'Account number daalo', pattern: { value: /^\d{9,18}$/, message: '9 se 18 digit ka number daalo' } })} error={errors.accountNumber?.message} />
            <Input label="Account number dobara daalo" inputMode="numeric" autoComplete="off" maxLength={18} onPaste={(e) => e.preventDefault()}
              {...register('confirmAccountNumber', { required: 'Dobara daalo', validate: (v) => v === getValues('accountNumber') || 'Account number match nahi karta' })} error={errors.confirmAccountNumber?.message} />
            <Input label="IFSC code" autoCapitalize="characters" maxLength={11} placeholder="SBIN0001234"
              {...register('ifsc', { required: 'IFSC daalo', validate: upperTest(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Sahi IFSC daalo (jaise SBIN0001234)') })} error={errors.ifsc?.message} />
            <Input label="UPI ID (optional)" placeholder="name@upi" autoCapitalize="none"
              {...register('upiId', { validate: (v) => !v || /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/.test(v.trim()) || 'Sahi UPI ID daalo' })} error={errors.upiId?.message} />
          </section>

          <section hidden={step !== 3} className="space-y-4">
            <h1 className="text-xl font-extrabold">Ek baar check kar lo</h1>
            <dl className="divide-y divide-surface-line rounded-xl border border-surface-line text-sm">
              {[
                ['Business', d.businessName],
                ['Pata', [d.addressLine, d.area, d.city, d.state, d.pincode].filter(Boolean).join(', ')],
                ['Delivery', `${d.radiusKm} km · ${Number(d.deliveryCharge) > 0 ? rupee(d.deliveryCharge) : 'Free'} · ${d.etaDays} din · COD ${d.codAvailable ? 'haan' : 'nahi'}`],
                ['PAN', d.panNumber ? `******${String(d.panNumber).toUpperCase().slice(6)}` : '-'],
                ['Bank', d.accountNumber ? `${d.accountName} · ****${String(d.accountNumber).slice(-4)} · ${String(d.ifsc || '').toUpperCase()}` : '-'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3 px-4 py-3"><dt className="w-20 shrink-0 text-ink-mute">{k}</dt><dd className="min-w-0 break-words font-semibold">{v || '-'}</dd></div>
              ))}
            </dl>
            <label className="flex items-start gap-3 rounded-xl bg-white p-1 md:p-0">
              <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600" {...register('acceptTerms', { validate: (v) => v || 'Aage badhne ke liye terms accept karo' })} />
              <span className="text-sm text-ink-soft">Maine <Link to="/seller" className="font-semibold text-brand-700 underline">Seller Terms</Link> padh liye hain aur main sahi jaankari de raha/rahi hoon.</span>
            </label>
            {errors.acceptTerms && <p className="text-xs text-danger">{errors.acceptTerms.message}</p>}
            <p className="rounded-xl bg-marigold-50 p-3 text-xs text-amber-800">Submit ke baad admin aapki details check karega (24 se 48 ghante). Approve hone par hi aap products jod paoge.</p>
          </section>
        </form>

        {/* Sticky action bar on phones, inline on larger screens */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-line bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:static md:mt-5 md:border-0 md:bg-transparent md:px-0 md:pb-0 md:pt-0">
          <div className="mx-auto flex max-w-2xl gap-3">
            {step > 0 && <Button variant="outline" size="lg" className="shrink-0" onClick={() => go(step - 1)}>Peeche</Button>}
            {step < 3
              ? <Button size="lg" full onClick={next}>Aage badho</Button>
              : <Button type="submit" form="seller-register" size="lg" full loading={loading}><Check className="h-5 w-5" />Submit karo</Button>}
          </div>
        </div>
      </main>
    </div>
  );
}
