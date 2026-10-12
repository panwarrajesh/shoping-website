import { useForm } from 'react-hook-form';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Badge from '../ui/Badge';
import LocationFields from './LocationFields';
import DeliveryFields from './DeliveryFields';
import PasswordInput from '../auth/PasswordInput';
import { useToast } from '../ui/Toast';

export const FORM_IDS = { business: 'seller-business-form', delivery: 'seller-delivery-form', payout: 'seller-payout-form', kyc: 'seller-kyc-form' };

// Maps server-side field errors onto the form, or shows a toast for general errors
const useFieldErrors = (form) => {
  const toast = useToast();
  return (e) => {
    if (e.fields) Object.entries(e.fields).forEach(([k, m]) => form.setError(k, { message: m[0] }));
    else if (e.code === 'BAD_PASSWORD') form.setError('password', { message: e.message });
    else toast.error(e.message);
  };
};
const numOrUndef = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? undefined : Number(v));

export function BusinessForm({ seller, onSubmit }) {
  const a = seller.address;
  const form = useForm({ defaultValues: {
    businessName: seller.businessName, description: seller.description || '', gstin: seller.gstin || '',
    addressLine: a.addressLine, area: a.area, city: a.city, state: a.state, pincode: a.pincode, latitude: a.latitude, longitude: a.longitude,
  } });
  const fail = useFieldErrors(form);
  const { register, handleSubmit, formState: { errors } } = form;
  const submit = async (v) => {
    try {
      await onSubmit({
        businessName: v.businessName, description: v.description || '', gstin: v.gstin || '',
        addressLine: v.addressLine, area: v.area || '', city: v.city, state: v.state, pincode: v.pincode,
        latitude: numOrUndef(form.getValues('latitude')), longitude: numOrUndef(form.getValues('longitude')),
      });
    } catch (e) { fail(e); }
  };
  return (
    <form id={FORM_IDS.business} onSubmit={handleSubmit(submit)} className="space-y-4 pt-2" noValidate>
      <Input label="Business ka naam" {...register('businessName', { required: 'Naam daalo', minLength: { value: 3, message: 'Kam se kam 3 akshar' } })} error={errors.businessName?.message} />
      <Textarea label="Business ke baare mein" maxLength={500} {...register('description')} />
      <Input label="GST number (optional)" autoCapitalize="characters" maxLength={15}
        {...register('gstin', { validate: (v) => !v || /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v.trim().toUpperCase()) || 'Sahi 15 akshar ka GSTIN daalo' })} error={errors.gstin?.message} />
      <LocationFields form={form} />
    </form>
  );
}

export function DeliveryForm({ seller, onSubmit }) {
  const z = seller.delivery || { radiusKm: 10, deliveryCharge: 0, etaDays: 2, codAvailable: true };
  const form = useForm({ defaultValues: {
    radiusKm: z.radiusKm, deliveryCharge: z.deliveryCharge, freeDeliveryAbove: z.freeDeliveryAbove ?? '', etaDays: z.etaDays, codAvailable: z.codAvailable,
  } });
  const fail = useFieldErrors(form);
  const submit = async (v) => {
    try {
      await onSubmit({
        radiusKm: Number(v.radiusKm), deliveryCharge: Number(v.deliveryCharge || 0),
        freeDeliveryAbove: numOrUndef(v.freeDeliveryAbove), etaDays: Number(v.etaDays), codAvailable: Boolean(v.codAvailable),
      });
    } catch (e) { fail(e); }
  };
  return (
    <form id={FORM_IDS.delivery} onSubmit={form.handleSubmit(submit)} className="pt-2" noValidate>
      <DeliveryFields form={form} city={seller.address.city} />
    </form>
  );
}

export function PayoutForm({ seller, onSubmit }) {
  const form = useForm({ defaultValues: { accountName: seller.payout.accountName || '', upiId: seller.payout.upiId || '', ifsc: seller.payout.ifsc || '' } });
  const fail = useFieldErrors(form);
  const { register, handleSubmit, getValues, formState: { errors } } = form;
  const upperTest = (re, msg) => (v) => re.test(String(v || '').trim().toUpperCase()) || msg;
  const submit = async (v) => {
    try { await onSubmit({ accountName: v.accountName, accountNumber: v.accountNumber, ifsc: v.ifsc, upiId: v.upiId || '', password: v.password }); }
    catch (e) { fail(e); }
  };
  return (
    <form id={FORM_IDS.payout} onSubmit={handleSubmit(submit)} className="space-y-4 pt-2" noValidate>
      <p className="rounded-xl bg-marigold-50 p-3 text-xs text-amber-800">
        Abhi ka account: {seller.payout.accountLast4 ? `****${seller.payout.accountLast4}` : 'koi nahi'}. Safety ke liye naya account number poora dobara daalna hoga aur password confirm karna hoga.
      </p>
      <Input label="Account holder ka naam" autoComplete="off" {...register('accountName', { required: 'Naam daalo' })} error={errors.accountName?.message} />
      <Input label="Naya bank account number" inputMode="numeric" autoComplete="off" maxLength={18}
        {...register('accountNumber', { required: 'Account number daalo', pattern: { value: /^\d{9,18}$/, message: '9 se 18 digit ka number daalo' } })} error={errors.accountNumber?.message} />
      <Input label="Account number dobara daalo" inputMode="numeric" autoComplete="off" maxLength={18} onPaste={(e) => e.preventDefault()}
        {...register('confirmAccountNumber', { required: 'Dobara daalo', validate: (v) => v === getValues('accountNumber') || 'Account number match nahi karta' })} error={errors.confirmAccountNumber?.message} />
      <Input label="IFSC code" autoCapitalize="characters" maxLength={11}
        {...register('ifsc', { required: 'IFSC daalo', validate: upperTest(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Sahi IFSC daalo') })} error={errors.ifsc?.message} />
      <Input label="UPI ID (optional)" autoCapitalize="none"
        {...register('upiId', { validate: (v) => !v || /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/.test(v.trim()) || 'Sahi UPI ID daalo' })} error={errors.upiId?.message} />
      <PasswordInput label="Confirm karne ke liye apna password daalo" {...register('password', { required: 'Password daalo' })} error={errors.password?.message} />
    </form>
  );
}

const KYC = { NOT_SUBMITTED: ['gray', 'Submit nahi hua'], PENDING: ['amber', 'Review mein'], VERIFIED: ['green', 'Verified'], REJECTED: ['red', 'Reject hua'] };

export function KycPanel({ seller, onSubmit }) {
  const v = seller.verification;
  const [tone, text] = KYC[v.status];
  const canSubmit = ['NOT_SUBMITTED', 'REJECTED'].includes(v.status);
  const form = useForm();
  const fail = useFieldErrors(form);
  const submit = async (d) => { try { await onSubmit({ panNumber: d.panNumber }); } catch (e) { fail(e); } };
  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-2"><span className="text-sm text-ink-soft">Status:</span><Badge tone={tone}>{text}</Badge></div>
      {v.panMasked && <p className="text-sm text-ink-soft">Submit kiya hua PAN: <b>{v.panMasked}</b></p>}
      {v.reviewNote && <p className="rounded-xl bg-red-50 p-3 text-sm text-danger">Admin ka note: {v.reviewNote}</p>}
      {v.status === 'PENDING' && <p className="text-sm text-ink-soft">Aapki details review mein hain. Natija aane tak intezaar karo.</p>}
      {v.status === 'VERIFIED' && <p className="text-sm text-ink-soft">Aapka KYC verify ho chuka hai.</p>}
      {canSubmit && (
        <form id={FORM_IDS.kyc} onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
          <Input label="PAN number" autoCapitalize="characters" maxLength={10} placeholder="ABCDE1234F"
            {...form.register('panNumber', { required: 'PAN daalo', validate: (x) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(x).trim().toUpperCase()) || 'Sahi PAN daalo' })}
            error={form.formState.errors.panNumber?.message} />
        </form>
      )}
    </div>
  );
}
