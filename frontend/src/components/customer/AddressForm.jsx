import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { LocateFixed, Check } from 'lucide-react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import MobileInput from '../auth/MobileInput';
import { INDIAN_STATES } from '../../utils/indianStates';
import { cleanMobile, isValidMobile } from '../../utils/phone';
import { useToast } from '../ui/Toast';

export const ADDRESS_FORM_ID = 'address-form';

export default function AddressForm({ initial, defaultMobile, onSubmit }) {
  const toast = useToast();
  const [coords, setCoords] = useState(initial?.latitude ? { latitude: Number(initial.latitude), longitude: Number(initial.longitude) } : null);
  const [locating, setLocating] = useState(false);
  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    defaultValues: {
      fullName: initial?.fullName || '', mobile: initial?.mobile || defaultMobile || '', line1: initial?.line1 || '',
      line2: initial?.line2 || '', landmark: initial?.landmark || '', city: initial?.city || '',
      state: initial?.state || '', pincode: initial?.pincode || '', isDefault: initial?.isDefault || false,
    },
  });

  const locate = () => {
    if (!navigator.geolocation) { toast.error('Is device mein location support nahi hai'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ latitude: +p.coords.latitude.toFixed(6), longitude: +p.coords.longitude.toFixed(6) }); setLocating(false); },
      () => { toast.error('Location nahi mili. Permission allow karo.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submit = async (v) => {
    try {
      await onSubmit({ ...v, mobile: cleanMobile(v.mobile), ...(coords || {}) });
    } catch (e) {
      if (e.fields) Object.entries(e.fields).forEach(([k, m]) => setError(k, { message: m[0] }));
      else toast.error(e.message);
    }
  };

  return (
    <form id={ADDRESS_FORM_ID} onSubmit={handleSubmit(submit)} className="space-y-4 pt-2" noValidate>
      <Input label="Poora naam" autoComplete="name" {...register('fullName', { required: 'Naam daalo', minLength: { value: 2, message: 'Naam bahut chhota hai' } })} error={errors.fullName?.message} />
      <MobileInput label="Mobile number" {...register('mobile', { validate: (v) => isValidMobile(v) || 'Sahi 10 digit mobile number daalo' })} error={errors.mobile?.message} />
      <Input label="Ghar no. / Gali / Mohalla" autoComplete="address-line1" {...register('line1', { required: 'Address daalo', minLength: { value: 3, message: 'Address bahut chhota hai' } })} error={errors.line1?.message} />
      <Input label="Area / Colony (optional)" autoComplete="address-line2" {...register('line2')} />
      <Input label="Landmark (optional)" placeholder="Jaise: school ke paas" {...register('landmark')} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Pincode" inputMode="numeric" maxLength={6} autoComplete="postal-code" {...register('pincode', { pattern: { value: /^[1-9]\d{5}$/, message: '6 digit pincode daalo' }, required: 'Pincode daalo' })} error={errors.pincode?.message} />
        <Input label="Sheher" autoComplete="address-level2" {...register('city', { required: 'Sheher daalo' })} error={errors.city?.message} />
      </div>
      <Select label="State" {...register('state', { required: 'State chuno' })} error={errors.state?.message}>
        <option value="">State chuno</option>
        {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
      </Select>
      <button type="button" onClick={locate} disabled={locating}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-600 text-sm font-semibold text-brand-700">
        {coords ? <><Check className="h-5 w-5" />Location save ho gayi (dobara lene ke liye tap karo)</>
          : <><LocateFixed className="h-5 w-5" />{locating ? 'Location dhundh rahe hain…' : 'Current location use karo (optional)'}</>}
      </button>
      <label className="flex min-h-[44px] items-center gap-3">
        <input type="checkbox" className="h-5 w-5 accent-brand-600" {...register('isDefault')} />
        <span className="text-sm font-semibold">Isko default address banao</span>
      </label>
    </form>
  );
}
