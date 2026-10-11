import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, Ban } from 'lucide-react';

export default function StatusBanner({ seller }) {
  const kycRejected = seller.verification.status === 'REJECTED';
  if (seller.status === 'SUSPENDED') {
    return <Banner tone="red" icon={Ban} title="Aapka seller account suspend hai" text={seller.suspendedReason || 'Zyada jaankari ke liye support se baat karo.'} />;
  }
  if (seller.status === 'REJECTED' || kycRejected) {
    return <Banner tone="red" icon={AlertTriangle} title="Aapki application reject hui"
      text={seller.verification.reviewNote || 'KYC details check karke dobara submit karo.'}
      action={<Link to="/seller/settings" className="mt-2 inline-block text-sm font-bold text-danger underline">KYC theek karo</Link>} />;
  }
  if (seller.status === 'PENDING') {
    return <Banner tone="amber" icon={Clock} title="Approval pending hai"
      text="Hum aapki details check kar rahe hain. Isme 24 se 48 ghante lag sakte hain. Approve hote hi aap products jod sakoge." />;
  }
  return null;
}

function Banner({ tone, icon: Icon, title, text, action }) {
  const cls = tone === 'red' ? 'bg-red-50 text-danger' : 'bg-marigold-50 text-amber-800';
  return (
    <div role="status" className={`flex gap-3 rounded-card p-4 ${cls}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0"><p className="text-sm font-extrabold">{title}</p><p className="mt-0.5 text-sm text-ink-soft">{text}</p>{action}</div>
    </div>
  );
}
