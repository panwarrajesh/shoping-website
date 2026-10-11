import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, LocateFixed, MapPin, Check, Loader2, X } from 'lucide-react';
import BottomSheet from '../ui/BottomSheet';
import { useToast } from '../ui/Toast';
import { locationService } from '../../services/locationService';
import { closeSheet, setLocation, clearLocation } from '../../store/locationSlice';

const fromPlace = (l) => ({
  locationId: l.id, label: l.label, city: l.city, area: l.area, state: l.state, pincode: l.pincode,
  latitude: l.latitude, longitude: l.longitude, source: 'manual',
});

export default function LocationSheet() {
  const dispatch = useDispatch();
  const toast = useToast();
  const open = useSelector((s) => s.location.sheetOpen);
  const current = useSelector((s) => s.location.current);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [popular, setPopular] = useState([]);
  const [searching, setSearching] = useState(false);
  const [gps, setGps] = useState(false);

  const close = () => dispatch(closeSheet());
  const text = q.trim();
  const searchable = text.length >= 2 || /^\d+$/.test(text);
  const isPincode = /^[1-9]\d{5}$/.test(text);

  useEffect(() => {
    if (!open) return;
    setQ(''); setResults([]);
    locationService.popular().then((d) => setPopular(d.locations)).catch(() => {});
  }, [open]);

  // Debounced: search 350ms after the customer stops typing
  useEffect(() => {
    if (!searchable) { setResults([]); setSearching(false); return undefined; }
    setSearching(true);
    const t = setTimeout(() => {
      locationService.search(text).then((d) => setResults(d.locations)).catch(() => setResults([])).finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [text, searchable]);

  const choose = (l) => { dispatch(setLocation(fromPlace(l))); close(); toast.success(`Location: ${l.label}`); };

  const choosePincodeOnly = () => {
    dispatch(setLocation({ label: `Pincode ${text}`, pincode: text, source: 'manual' })); close();
    toast.success(`Location: Pincode ${text}`);
  };

  const useGps = () => {
    if (!navigator.geolocation) { toast.error('Is device mein location support nahi hai'); return; }
    setGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = +pos.coords.latitude.toFixed(5); const longitude = +pos.coords.longitude.toFixed(5);
        let place = null;
        try { place = (await locationService.reverse(latitude, longitude)).location; } catch { /* name stays generic */ }
        // pincode is deliberately not copied from the nearest known place: the GPS point itself is the precise part
        dispatch(setLocation({ latitude, longitude, locationId: place?.id, label: place ? `${place.label} (current)` : 'Current location', city: place?.city, state: place?.state, source: 'gps' }));
        setGps(false); close(); toast.success('Current location set ho gayi');
      },
      (err) => {
        setGps(false);
        toast.error(err.code === 1 ? 'Location permission band hai. Browser settings mein allow karo, ya neeche se area chuno.' : 'Location nahi mil paayi. Neeche se area chuno.');
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
    );
  };

  const Row = ({ l }) => {
    const active = current?.locationId === l.id && current?.source !== 'gps';
    return (
      <li>
        <button onClick={() => choose(l)} className="flex min-h-[56px] w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-alt active:bg-surface-alt">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700"><MapPin className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{l.label}</span><span className="block text-xs text-ink-mute">{l.state} · {l.pincode}</span></span>
          {active && <Check className="h-5 w-5 shrink-0 text-brand-600" />}
        </button>
      </li>
    );
  };

  return (
    <BottomSheet open={open} onClose={close} title="Apna area chuno">
      <div className="space-y-4 pt-1">
        <button onClick={useGps} disabled={gps}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-brand-600 bg-brand-50 px-4 text-sm font-bold text-brand-700 disabled:opacity-70">
          {gps ? <Loader2 className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5" />}{gps ? 'Location dhundh rahe hain…' : 'Meri current location use karo'}
        </button>

        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sheher, area ya pincode likho" inputMode="search" autoComplete="off"
            className="h-12 w-full rounded-xl border border-surface-line pl-10 pr-10 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
          {q && <button onClick={() => setQ('')} aria-label="Clear" className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-ink-mute"><X className="h-4 w-4" /></button>}
        </label>

        {searchable ? (
          searching ? <p className="py-4 text-center text-sm text-ink-soft">Dhundh rahe hain…</p>
          : results.length > 0 ? <ul className="space-y-1">{results.map((l) => <Row key={l.id} l={l} />)}</ul>
          : (
            <div className="rounded-xl bg-surface-alt p-4 text-center text-sm text-ink-soft">
              <p>"{text}" abhi hamari list mein nahi hai.</p>
              {isPincode && <button onClick={choosePincodeOnly} className="mt-3 h-11 rounded-xl bg-brand-600 px-4 font-semibold text-white">Sirf pincode {text} use karo</button>}
            </div>
          )
        ) : (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-mute">Popular areas</p>
            {popular.length ? <ul className="space-y-1">{popular.map((l) => <Row key={l.id} l={l} />)}</ul> : <p className="text-sm text-ink-soft">Upar search karke area chuno.</p>}
          </div>
        )}

        {current && (
          <button onClick={() => { dispatch(clearLocation()); close(); }} className="h-11 w-full text-sm font-semibold text-danger">
            Location hatao ({current.label})
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
