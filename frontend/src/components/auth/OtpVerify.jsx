import { useState } from 'react';
import OtpInput from './OtpInput';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';
import useCountdown from '../../hooks/useCountdown';
import { authService } from '../../services/authService';

// Reusable OTP screen used by Login and Register.
export default function OtpVerify({ mobile, purpose, initialDevOtp, onVerified, onChangeNumber }) {
  const toast = useToast();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState(initialDevOtp);
  const [left, restart] = useCountdown(30);

  const submit = async (code) => {
    if (loading) return;
    setLoading(true); setError('');
    try {
      onVerified(await authService.verifyOtp({ mobile, otp: code, purpose }));
    } catch (e) {
      setError(e.message); setOtp('');
    } finally { setLoading(false); }
  };

  const resend = async () => {
    try {
      const d = await authService.sendOtp({ mobile, purpose });
      setDevOtp(d.devOtp); setOtp(''); setError(''); restart();
      toast.success('Naya OTP bhej diya gaya');
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-soft">
        OTP bheja gaya hai <span className="font-bold text-ink">+91 {mobile}</span> par.{' '}
        <button type="button" onClick={onChangeNumber} className="font-semibold text-brand-700 underline">Number badlo</button>
      </p>
      <OtpInput value={otp} onChange={setOtp} onComplete={submit} error={Boolean(error)} autoFocus />
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {devOtp && (
        <p className="rounded-lg bg-marigold-50 px-3 py-2 text-xs text-amber-800">
          Testing mode: aapka OTP <b>{devOtp}</b> hai (production mein yeh nahi dikhega)
        </p>
      )}
      <Button full size="lg" loading={loading} disabled={otp.length !== 6} onClick={() => submit(otp)}>
        Verify karo
      </Button>
      <div className="text-center text-sm text-ink-soft">
        {left > 0 ? <>OTP dobara bhejo <b>{left}s</b> mein</> :
          <button type="button" onClick={resend} className="h-11 font-semibold text-brand-700">OTP dobara bhejo</button>}
      </div>
    </div>
  );
}
