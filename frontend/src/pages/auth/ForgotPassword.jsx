import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AuthLayout from '../../components/layout/AuthLayout';
import MobileInput from '../../components/auth/MobileInput';
import PasswordInput from '../../components/auth/PasswordInput';
import OtpInput from '../../components/auth/OtpInput';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { authService } from '../../services/authService';
import { cleanMobile, isValidMobile } from '../../utils/phone';

export default function ForgotPassword() {
  const [step, setStep] = useState('mobile');
  const [mobile, setMobile] = useState('');
  const [devOtp, setDevOtp] = useState();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const a = useForm();
  const b = useForm();

  const sendOtp = async (v) => {
    setLoading(true);
    try {
      const m = cleanMobile(v.mobile);
      const d = await authService.sendOtp({ mobile: m, purpose: 'RESET_PASSWORD' });
      setMobile(m); setDevOtp(d.devOtp); setStep('reset');
    } catch (e) { a.setError('mobile', { message: e.message }); } finally { setLoading(false); }
  };

  const reset = async (v) => {
    if (otp.length !== 6) { toast.error('6 digit OTP daalo'); return; }
    setLoading(true);
    try {
      await authService.resetPassword({ mobile, otp, newPassword: v.password });
      toast.success('Password badal gaya. Ab login karo.');
      navigate('/login', { replace: true });
    } catch (e) { toast.error(e.message); setOtp(''); } finally { setLoading(false); }
  };

  if (step === 'reset') {
    return (
      <AuthLayout title="Naya password banao" subtitle={`OTP +91 ${mobile} par bheja gaya hai`} onBack={() => setStep('mobile')}>
        <form onSubmit={b.handleSubmit(reset)} className="space-y-5" noValidate>
          <OtpInput value={otp} onChange={setOtp} autoFocus />
          {devOtp && <p className="rounded-lg bg-marigold-50 px-3 py-2 text-xs text-amber-800">Testing mode: OTP <b>{devOtp}</b></p>}
          <PasswordInput label="Naya password" autoComplete="new-password" hint="Kam se kam 8 characters, ek letter aur ek number"
            {...b.register('password', {
              required: 'Naya password daalo',
              validate: (v) => (v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v)) || 'Kam se kam 8 characters, ek letter aur ek number chahiye',
            })}
            error={b.formState.errors.password?.message} />
          <Button type="submit" full size="lg" loading={loading}>Password badlo</Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Password bhool gaye?" subtitle="Mobile number daalo, hum OTP bhejenge" onBack={() => navigate('/login')}>
      <form onSubmit={a.handleSubmit(sendOtp)} className="space-y-5" noValidate>
        <MobileInput {...a.register('mobile', { validate: (v) => isValidMobile(v) || 'Sahi 10 digit mobile number daalo' })}
          error={a.formState.errors.mobile?.message} />
        <Button type="submit" full size="lg" loading={loading}>OTP bhejo</Button>
      </form>
    </AuthLayout>
  );
}
