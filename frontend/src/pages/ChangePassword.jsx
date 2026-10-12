import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import PageHeader from '../components/layout/PageHeader';
import PasswordInput from '../components/auth/PasswordInput';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { customerService } from '../services/customerService';
import { startSession } from '../store/authSlice';

export default function ChangePassword() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [noPassword, setNoPassword] = useState(false);
  const { register, handleSubmit, setError, formState: { errors } } = useForm();

  const submit = async (v) => {
    setLoading(true);
    try {
      dispatch(startSession(await customerService.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword })));
      toast.success('Password badal gaya. Baaki devices logout ho gaye.');
      navigate('/profile', { replace: true });
    } catch (e) {
      if (e.code === 'NO_PASSWORD') setNoPassword(true);
      else if (e.code === 'BAD_CURRENT_PASSWORD') setError('currentPassword', { message: e.message });
      else if (e.fields) Object.entries(e.fields).forEach(([k, m]) => setError(k, { message: m[0] }));
      else toast.error(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Password badlo" />
      {noPassword && (
        <div className="mb-4 rounded-card bg-marigold-50 p-4 text-sm">
          Aapne abhi tak password nahi banaya hai (aap OTP se login karte ho). OTP se password banane ke liye{' '}
          <Link to="/forgot-password" className="font-bold text-brand-700 underline">yahan tap karo</Link> (pehle logout karna padega).
        </div>
      )}
      <form onSubmit={handleSubmit(submit)} className="space-y-4 rounded-card bg-white p-4 shadow-card" noValidate>
        <PasswordInput label="Abhi ka password" {...register('currentPassword', { required: 'Abhi ka password daalo' })} error={errors.currentPassword?.message} />
        <PasswordInput label="Naya password" autoComplete="new-password" hint="Kam se kam 8 characters, ek letter aur ek number"
          {...register('newPassword', { required: 'Naya password daalo', validate: (v) => (v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v)) || 'Kam se kam 8 characters, ek letter aur ek number chahiye' })}
          error={errors.newPassword?.message} />
        <Button type="submit" full size="lg" loading={loading}>Password badlo</Button>
      </form>
    </div>
  );
}
