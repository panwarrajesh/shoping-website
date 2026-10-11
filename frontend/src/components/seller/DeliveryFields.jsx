import Input from '../ui/Input';
import Switch from '../ui/Switch';

const CHIPS = [5, 10, 20, 30, 50];

// Shared by seller registration and delivery settings.
export default function DeliveryFields({ form, city }) {
  const { register, watch, setValue, formState: { errors } } = form;
  const radius = Number(watch('radiusKm') || 10);

  return (
    <div className="space-y-5">
      <div className="rounded-card border border-surface-line bg-white p-4">
        <div className="flex items-end justify-between">
          <span className="text-sm font-semibold">Delivery radius</span>
          <span className="text-3xl font-extrabold text-brand-700">{radius}<span className="ml-1 text-base font-bold">km</span></span>
        </div>
        <input type="range" min={1} max={50} step={1} aria-label="Delivery radius in km"
          className="mt-3 h-8 w-full cursor-pointer accent-brand-600" {...register('radiusKm', { valueAsNumber: true })} />
        <div className="mt-2 flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <button key={c} type="button" onClick={() => setValue('radiusKm', c, { shouldDirty: true })}
              className={`h-10 min-w-[56px] rounded-pill border px-3 text-sm font-semibold ${radius === c ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-surface-line text-ink-soft'}`}>{c} km</button>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          Aapke products {city ? `${city} se ` : ''}{radius} km ke andar ke customers ko dikhenge.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Delivery charge (₹)" type="number" inputMode="decimal" min={0} step="1"
          {...register('deliveryCharge', { required: 'Charge daalo (free ke liye 0)', min: { value: 0, message: '0 se kam nahi ho sakta' }, max: { value: 1000, message: 'Maximum ₹1000' } })}
          error={errors.deliveryCharge?.message} hint="Free delivery ke liye 0 rakho" />
        <Input label="Is amount se upar free delivery (optional)" type="number" inputMode="decimal" min={0} step="1" placeholder="Jaise 999"
          {...register('freeDeliveryAbove')} error={errors.freeDeliveryAbove?.message} />
      </div>
      <Input label="Delivery mein kitne din lagenge" type="number" inputMode="numeric" min={1} max={10}
        {...register('etaDays', { required: 'Din daalo', min: { value: 1, message: 'Kam se kam 1 din' }, max: { value: 10, message: 'Maximum 10 din' } })}
        error={errors.etaDays?.message} />
      <Switch label="Cash on Delivery (COD)" hint="Customer ghar par paise de sakta hai" {...register('codAvailable')} />
    </div>
  );
}
