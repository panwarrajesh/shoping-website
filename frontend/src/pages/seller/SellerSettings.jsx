import { useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Image as ImageIcon, Building2, Truck, Landmark, FileCheck2, ChevronRight, Store, Boxes, Undo2, Star, ExternalLink, LogOut } from 'lucide-react';
import BottomSheet from '../../components/ui/BottomSheet';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import LogoUploader from '../../components/seller/LogoUploader';
import { BusinessForm, DeliveryForm, PayoutForm, KycPanel, FORM_IDS } from '../../components/seller/SettingsForms';
import { sellerService } from '../../services/sellerService';
import { logout } from '../../store/authSlice';

function Row({ icon: Icon, label, hint, onClick, to }) {
  const inner = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1 text-left"><span className="block text-sm font-semibold">{label}</span>{hint && <span className="block truncate text-xs text-ink-mute">{hint}</span>}</span>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-mute" />
    </>
  );
  const cls = 'flex min-h-[60px] w-full items-center gap-3 px-4 py-3 active:bg-surface-alt';
  return to ? <Link to={to} className={cls}>{inner}</Link> : <button onClick={onClick} className={cls}>{inner}</button>;
}

export default function SellerSettings() {
  const { seller, setSeller } = useOutletContext();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(null); // business | delivery | payout | kyc
  const [saving, setSaving] = useState(false);

  // Each form handles its own field errors; we only track the saving state and the success path.
  const save = (apiCall, okMsg) => async (values) => {
    setSaving(true);
    try {
      const d = await apiCall(values);
      setSeller(d.seller); toast.success(okMsg); setOpen(null);
    } finally { setSaving(false); }
  };

  const saveBtn = (id, text) => <Button type="submit" form={id} full size="lg" loading={saving}>{text}</Button>;
  const kycOpen = ['NOT_SUBMITTED', 'REJECTED'].includes(seller.verification.status);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-extrabold lg:text-2xl">Settings</h1>

      <div className="divide-y divide-surface-line overflow-hidden rounded-card bg-white shadow-card">
        <Row icon={ImageIcon} label="Store logo" hint={seller.logoUrl ? 'Upload ho chuka hai' : 'Abhi nahi lagaya'} onClick={() => setOpen('logo')} />
        <Row icon={Building2} label="Business info aur pata" hint={`${seller.businessName} · ${seller.address.city}`} onClick={() => setOpen('business')} />
        <Row icon={Truck} label="Delivery area aur charges" hint={seller.delivery ? `${seller.delivery.radiusKm} km · COD ${seller.delivery.codAvailable ? 'on' : 'off'}` : undefined} onClick={() => setOpen('delivery')} />
        <Row icon={Landmark} label="Payout (bank / UPI)" hint={seller.payout.accountLast4 ? `****${seller.payout.accountLast4}` : 'Add karo'} onClick={() => setOpen('payout')} />
        <Row icon={FileCheck2} label="KYC verification" hint={seller.verification.status.replace('_', ' ').toLowerCase()} onClick={() => setOpen('kyc')} />
      </div>

      <div className="divide-y divide-surface-line overflow-hidden rounded-card bg-white shadow-card">
        <Row icon={Store} label="Store profile" to="/seller/profile" />
        <Row icon={Boxes} label="Inventory" to="/seller/inventory" />
        <Row icon={Undo2} label="Returns" to="/seller/returns" />
        <Row icon={Star} label="Reviews" to="/seller/reviews" />
        <Row icon={ExternalLink} label="Customer site dekho" to="/" />
      </div>

      <Button variant="outline" full size="lg" onClick={async () => { await dispatch(logout()); navigate('/login'); }}><LogOut className="h-5 w-5" />Logout</Button>

      <BottomSheet open={open === 'logo'} onClose={() => setOpen(null)} title="Store logo">
        <LogoUploader logoUrl={seller.logoUrl} onDone={(logoUrl) => setSeller({ ...seller, logoUrl })} />
      </BottomSheet>
      <BottomSheet open={open === 'business'} onClose={() => setOpen(null)} title="Business info" footer={saveBtn(FORM_IDS.business, 'Save karo')}>
        <BusinessForm seller={seller} onSubmit={save(sellerService.updateProfile, 'Business details update ho gayi')} />
      </BottomSheet>
      <BottomSheet open={open === 'delivery'} onClose={() => setOpen(null)} title="Delivery settings" footer={saveBtn(FORM_IDS.delivery, 'Save karo')}>
        <DeliveryForm seller={seller} onSubmit={save(sellerService.updateDelivery, 'Delivery settings update ho gayi')} />
      </BottomSheet>
      <BottomSheet open={open === 'payout'} onClose={() => setOpen(null)} title="Payout details" footer={saveBtn(FORM_IDS.payout, 'Payout details badlo')}>
        <PayoutForm seller={seller} onSubmit={save(sellerService.updatePayout, 'Payout details update ho gayi')} />
      </BottomSheet>
      <BottomSheet open={open === 'kyc'} onClose={() => setOpen(null)} title="KYC verification" footer={kycOpen ? saveBtn(FORM_IDS.kyc, 'Review ke liye submit karo') : undefined}>
        <KycPanel seller={seller} onSubmit={save(sellerService.submitKyc, 'KYC review ke liye bhej diya')} />
      </BottomSheet>
    </div>
  );
}
