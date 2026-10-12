import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

export default function Register() {
  const [step, setStep] = useState('form');
  const [info, setInfo] = useState({});
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const { register, handleSubmit, setError, formState: { errors } } = useForm();

  const submit = async (v) => {
    setLoading(true);
    try {
      const mobile = cleanMobile(v.mobile);
      const d = await authService.register({ name: v.name, mobile, email: v.email, password: v.password });
      setInfo({ mobile, devOtp: d.devOtp }); setStep('verify');
    } catch (e) {
      const field = e.code === 'EMAIL_EXISTS' ? 'email' : e.code === 'MOBILE_EXISTS' ? 'mobile' : null;
      if (field) setError(field, { message: e.message });
      else if (e.fields) Object.entries(e.fields).forEach(([k, m]) => setError(k, { message: m[0] }));
      else toast.error(e.message);
    } finally { setLoading(false); }
  };

  if (step === 'verify') {
    return (
      <AuthLayout title="Mobile verify karo" subtitle="Account banane ke liye last step" onBack={() => setStep('form')}>
        <OtpVerify mobile={info.mobile} purpose="REGISTER" initialDevOtp={info.devOtp}
          onChangeNumber={() => setStep('form')}
          onVerified={(data) => { dispatch(startSession(data)); toast.success('Account ban gaya. Swagat hai!'); navigate('/', { replace: true }); }} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Account banao" subtitle="Apne area ke sellers se kharidari shuru karo">
      <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <Input label="Poora naam" autoComplete="name" placeholder="Aapka naam"
          {...register('name', { required: 'Apna naam daalo', minLength: { value: 2, message: 'Naam bahut chhota hai' } })}
          error={errors.name?.message} />
        <MobileInput {...register('mobile', { validate: (v) => isValidMobile(v) || 'Sahi 10 digit mobile number daalo' })}
          error={errors.mobile?.message} />
        <Input label="Email (optional)" type="email" autoComplete="email" placeholder="name@example.com"
          {...register('email', { pattern: { value: /^\S+@\S+\.\S+$/, message: 'Sahi email daalo' } })}
          error={errors.email?.message} />
        <PasswordInput label="Password banao" autoComplete="new-password"
          hint="Kam se kam 8 characters, ek letter aur ek number"
          {...register('password', {
            required: 'Password daalo',
            validate: (v) => (v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v)) || 'Kam se kam 8 characters, ek letter aur ek number chahiye',
          })}
          error={errors.password?.message} />
        <Button type="submit" full size="lg" loading={loading}>OTP bhejo</Button>
      </form>
      <p className="mt-4 text-center text-xs text-ink-mute">Account banakar aap hamari Terms aur Privacy Policy se sahmat hain.</p>
      <p className="mt-5 text-center text-sm text-ink-soft">
        Pehle se account hai? <Link to="/login" className="font-bold text-brand-700">Login karo</Link>
      </p>
    </AuthLayout>
  );
}
