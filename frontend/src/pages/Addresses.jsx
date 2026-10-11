import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { MapPin, Plus, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import BottomSheet from '../components/ui/BottomSheet';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import AddressForm, { ADDRESS_FORM_ID } from '../components/customer/AddressForm';
import { customerService } from '../services/customerService';

export default function Addresses() {
  const user = useSelector((s) => s.auth.user);
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState({ open: false, address: null });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState({ target: null, loading: false });

  const load = useCallback(async () => {
    try { setItems((await customerService.addresses()).addresses); }
    catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (values) => {
    setSaving(true);
    try {
      if (sheet.address) await customerService.updateAddress(sheet.address.id, values);
      else await customerService.addAddress(values);
      toast.success(sheet.address ? 'Address update ho gaya' : 'Address save ho gaya');
      setSheet({ open: false, address: null });
      await load();
    } finally { setSaving(false); }
  };

  const makeDefault = async (a) => {
    try { await customerService.setDefaultAddress(a.id); await load(); toast.success('Default address badal gaya'); }
    catch (e) { toast.error(e.message); }
  };

  const confirmDelete = async () => {
    setDeleting((d) => ({ ...d, loading: true }));
    try { await customerService.deleteAddress(deleting.target.id); toast.success('Address delete ho gaya'); await load(); }
    catch (e) { toast.error(e.message); }
    setDeleting({ target: null, loading: false });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Saved addresses" action={items.length > 0 && (
        <Button size="md" onClick={() => setSheet({ open: true, address: null })}><Plus className="h-4 w-4" />Naya</Button>)} />

      {loading ? <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-36 rounded-card" />)}</div>
        : items.length === 0 ? (
          <div className="rounded-card bg-white shadow-card">
            <EmptyState icon={MapPin} title="Koi address save nahi hai" text="Delivery ke liye apna address jodo."
              action={<Button onClick={() => setSheet({ open: true, address: null })}><Plus className="h-4 w-4" />Address jodo</Button>} />
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((a) => (
              <li key={a.id} className="rounded-card bg-white p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-extrabold">{a.fullName}</p>
                  {a.isDefault && <Badge tone="green"><CheckCircle2 className="h-3 w-3" />Default</Badge>}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  {[a.line1, a.line2, a.landmark].filter(Boolean).join(', ')}<br />{a.city}, {a.state} - {a.pincode}
                </p>
                <p className="mt-1 text-sm text-ink-soft">Mobile: +91 {a.mobile}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => setSheet({ open: true, address: a })} className="flex h-10 items-center gap-1.5 rounded-lg border border-surface-line px-3 text-sm font-semibold"><Pencil className="h-4 w-4" />Edit</button>
                  <button onClick={() => setDeleting({ target: a, loading: false })} className="flex h-10 items-center gap-1.5 rounded-lg border border-surface-line px-3 text-sm font-semibold text-danger"><Trash2 className="h-4 w-4" />Delete</button>
                  {!a.isDefault && <button onClick={() => makeDefault(a)} className="flex h-10 items-center rounded-lg px-3 text-sm font-semibold text-brand-700">Default banao</button>}
                </div>
              </li>
            ))}
          </ul>
        )}

      <BottomSheet open={sheet.open} onClose={() => setSheet({ open: false, address: null })}
        title={sheet.address ? 'Address edit karo' : 'Naya address'}
        footer={<Button type="submit" form={ADDRESS_FORM_ID} full size="lg" loading={saving}>Address save karo</Button>}>
        <AddressForm key={sheet.address?.id || 'new'} initial={sheet.address} defaultMobile={user.mobile} onSubmit={save} />
      </BottomSheet>

      <ConfirmDialog open={Boolean(deleting.target)} danger title="Address delete karein?" confirmText="Delete karo"
        message="Yeh address hamesha ke liye hat jayega. Purane orders par asar nahi padega."
        loading={deleting.loading} onConfirm={confirmDelete} onClose={() => setDeleting({ target: null, loading: false })} />
    </div>
  );
}
