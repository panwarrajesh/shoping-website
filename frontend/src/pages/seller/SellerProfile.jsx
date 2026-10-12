import { Link, useOutletContext } from 'react-router-dom';
import { BadgeCheck, MapPin, Truck, Landmark, FileCheck2, Pencil } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import StatusBanner from '../../components/seller/StatusBanner';
import { rupee } from '../../utils/cn';

const KYC = { NOT_SUBMITTED: ['gray', 'Submit nahi hua'], PENDING: ['amber', 'Review mein'], VERIFIED: ['green', 'Verified'], REJECTED: ['red', 'Reject hua'] };

function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3 px-4 py-3.5">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1"><p className="text-xs text-ink-mute">{label}</p><div className="text-sm font-semibold">{children}</div></div>
    </div>
  );
}

export default function SellerProfile() {
  const { seller: s } = useOutletContext();
  const [kycTone, kycText] = KYC[s.verification.status];
  const a = s.address;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <StatusBanner seller={s} />
      <div className="flex items-center gap-4 rounded-card bg-white p-4 shadow-card">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-100 text-2xl font-extrabold text-brand-700">
          {s.logoUrl ? <img src={s.logoUrl} alt="" className="h-full w-full object-cover" /> : s.businessName[0].toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-extrabold">{s.businessName}</h1>
          <div className="mt-1 flex flex-wrap gap-2">
            {s.isVerified ? <Badge tone="green"><BadgeCheck className="h-3 w-3" />Verified Seller</Badge> : <Badge tone="gray">Not verified yet</Badge>}
            <Badge tone={s.status === 'APPROVED' ? 'green' : s.status === 'PENDING' ? 'amber' : 'red'}>{s.status}</Badge>
          </div>
        </div>
        <Link to="/seller/settings"><Button variant="outline" size="md"><Pencil className="h-4 w-4" />Edit</Button></Link>
      </div>
      {s.description && <p className="rounded-card bg-white p-4 text-sm text-ink-soft shadow-card">{s.description}</p>}

      <div className="divide-y divide-surface-line overflow-hidden rounded-card bg-white shadow-card">
        <Row icon={MapPin} label="Dukaan ka pata">{[a.addressLine, a.area, a.city, a.state, a.pincode].filter(Boolean).join(', ')}</Row>
        <Row icon={Truck} label="Delivery">
          {s.delivery ? `${s.delivery.radiusKm} km · ${s.delivery.deliveryCharge > 0 ? rupee(s.delivery.deliveryCharge) : 'Free'} · ${s.delivery.etaDays} din · COD ${s.delivery.codAvailable ? 'haan' : 'nahi'}` : 'Set nahi hai'}
        </Row>
        <Row icon={Landmark} label="Payout account">
          {s.payout.accountLast4 ? <>{s.payout.accountName} · ****{s.payout.accountLast4}<br /><span className="text-xs font-medium text-ink-mute">{s.payout.ifsc}{s.payout.upiId ? ` · ${s.payout.upiId}` : ''}</span></> : 'Add nahi hua'}
        </Row>
        <Row icon={FileCheck2} label="KYC">
          <span className="flex flex-wrap items-center gap-2"><Badge tone={kycTone}>{kycText}</Badge>{s.verification.panMasked && <span className="text-xs text-ink-mute">PAN {s.verification.panMasked}</span>}</span>
          {s.gstin && <span className="mt-1 block text-xs font-medium text-ink-mute">GSTIN {s.gstin}</span>}
        </Row>
      </div>
    </div>
  );
}
