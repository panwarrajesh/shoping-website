import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import AuthLayout from '../../components/layout/AuthLayout';
import MobileInput from '../../components/auth/MobileInput';
import PasswordInput from '../../components/auth/PasswordInput';
import OtpVerify from '../../components/auth/OtpVerify';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { authService } from '../../services/authService';
import { startSession } from '../../store/authSlice';
import { cleanMobile, isValidMobile } from '../../utils/phone';
import { cn } from '../../utils/cn';

export default function Login() {
  const [mode, setMode] = useState('otp'); // otp | password
  const [step, setStep] = useState('form'); // form | verify
  const [mobile, setMobile] = useState('');
  const [devOtp, setDevOtp] = useState();
  const [pendingVerify, setPendingVerify] = useState(false); // unverified account trying password login
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const otpForm = useForm();
  const pwForm = useForm();
  const from = location.state?.from?.pathname || '/';

  const done = (data) => {
    dispatch(startSession(data));
    toast.success('Login ho gaya. Swagat hai!');
    navigate(from, { replace: true });
  };

  const sendOtp = async ({ mobile: m }) => {
    setLoading(true);
    try {
      const num = cleanMobile(m);
      const d = await authService.sendOtp({ mobile: num, purpose: 'LOGIN' });
      setMobile(num); setDevOtp(d.devOtp); setPendingVerify(false); setStep('verify');
    } catch (e) { otpForm.setError('mobile', { message: e.message }); } finally { setLoading(false); }
  };

  const passwordLogin = async ({ identifier, password }) => {
    setLoading(true);
    try {
      done(await authService.login({ identifier, password }));
    } catch (e) {
      if (e.code === 'MOBILE_NOT_VERIFIED') {
        setMobile(e.details.mobile); setDevOtp(undefined); setPendingVerify(true); setStep('verify');
        toast.error(e.message);
      } else pwForm.setError('password', { message: e.message });
    } finally { setLoading(false); }
  };

  if (step === 'verify') {
    return (
      <AuthLayout title="OTP daalo" subtitle="Sirf ek step aur" onBack={() => setStep('form')}>
        <OtpVerify mobile={mobile} purpose={pendingVerify ? 'REGISTER' : 'LOGIN'} initialDevOtp={devOtp}
          onVerified={done} onChangeNumber={() => setStep('form')} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Login karo" subtitle="Mobile number se turant login karo">
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-surface-alt p-1" role="tablist">
        {[['otp', 'OTP se'], ['password', 'Password se']].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
            className={cn('h-10 rounded-lg text-sm font-semibold transition-colors',
              mode === k ? 'bg-white text-brand-700 shadow-card' : 'text-ink-soft')}>{label}</button>
        ))}
      </div>

      {mode === 'otp' ? (
        <form onSubmit={otpForm.handleSubmit(sendOtp)} className="space-y-5" noValidate>
          <MobileInput {...otpForm.register('mobile', { validate: (v) => isValidMobile(v) || 'Sahi 10 digit mobile number daalo' })}
            error={otpForm.formState.errors.mobile?.message} />
          <Button type="submit" full size="lg" loading={loading}>OTP bhejo</Button>
        </form>
      ) : (
        <form onSubmit={pwForm.handleSubmit(passwordLogin)} className="space-y-4" noValidate>
          <Input label="Mobile number ya email" autoComplete="username" placeholder="9876543210"
            {...pwForm.register('identifier', { required: 'Mobile number ya email daalo' })}
            error={pwForm.formState.errors.identifier?.message} />
          <PasswordInput {...pwForm.register('password', { required: 'Password daalo' })}
            error={pwForm.formState.errors.password?.message} />
          <div className="text-right"><Link to="/forgot-password" className="text-sm font-semibold text-brand-700">Password bhool gaye?</Link></div>
          <Button type="submit" full size="lg" loading={loading}>Login</Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-ink-soft">
        Naye ho? <Link to="/register" className="font-bold text-brand-700">Account banao</Link>
      </p>
      <p className="mt-2 text-center text-sm text-ink-soft">
        Business karna hai? <Link to="/seller/register" className="font-bold text-brand-700">Seller bano</Link>
      </p>
    </AuthLayout>
  );
}
