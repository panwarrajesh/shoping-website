import { useState } from 'react';
import { LocateFixed, Check } from 'lucide-react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { INDIAN_STATES } from '../../utils/indianStates';
import { useToast } from '../ui/Toast';

// Shared by seller registration and business settings. `form` is the react-hook-form instance.
export default function LocationFields({ form }) {
  const { register, setValue, watch, formState: { errors } } = form;
  const toast = useToast();
  const [locating, setLocating] = useState(false);
  const hasCoords = watch('latitude') != null && watch('latitude') !== '';

  const locate = () => {
    if (!navigator.geolocation) { toast.error('Is device mein location support nahi hai'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setValue('latitude', +p.coords.latitude.toFixed(6)); setValue('longitude', +p.coords.longitude.toFixed(6));
        setLocating(false); toast.success('Dukaan ki location save ho gayi');
      },
      () => { toast.error('Location nahi mili. Permission allow karo.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-4">
      <Input label="Dukaan / ghar ka pata" autoComplete="address-line1" placeholder="Shop no, gali, mohalla"
        {...register('addressLine', { required: 'Pata daalo', minLength: { value: 3, message: 'Pata bahut chhota hai' } })} error={errors.addressLine?.message} />
      <Input label="Area / Colony (optional)" {...register('area')} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Pincode" inputMode="numeric" maxLength={6} autoComplete="postal-code"
          {...register('pincode', { required: 'Pincode daalo', pattern: { value: /^[1-9]\d{5}$/, message: '6 digit pincode daalo' } })} error={errors.pincode?.message} />
        <Input label="Sheher" autoComplete="address-level2" {...register('city', { required: 'Sheher daalo' })} error={errors.city?.message} />
      </div>
      <Select label="State" {...register('state', { required: 'State chuno' })} error={errors.state?.message}>
        <option value="">State chuno</option>
        {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
      </Select>
      <button type="button" onClick={locate} disabled={locating}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-600 px-3 text-sm font-semibold text-brand-700">
        {hasCoords ? <><Check className="h-5 w-5 shrink-0" />Location save ho gayi (dobara lene ke liye tap karo)</>
          : <><LocateFixed className="h-5 w-5 shrink-0" />{locating ? 'Location dhundh rahe hain…' : 'Dukaan ki exact location lo (optional, distance sahi aayegi)'}</>}
      </button>
    </div>
  );
}
