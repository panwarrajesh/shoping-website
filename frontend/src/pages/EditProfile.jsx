import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import PageHeader from '../components/layout/PageHeader';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { customerService } from '../services/customerService';
import { setUser } from '../store/authSlice';

export default function EditProfile() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setError, formState: { errors } } = useForm({ defaultValues: { name: user.name === 'Customer' ? '' : user.name, email: user.email || '' } });

  const submit = async (v) => {
    setLoading(true);
    try {
      const d = await customerService.updateProfile({ name: v.name, email: v.email });
      dispatch(setUser(d.user));
      toast.success('Profile update ho gaya');
      navigate('/profile', { replace: true });
    } catch (e) {
      if (e.code === 'EMAIL_EXISTS') setError('email', { message: e.message });
      else if (e.fields) Object.entries(e.fields).forEach(([k, m]) => setError(k, { message: m[0] }));
      else toast.error(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Profile edit karo" />
      <form onSubmit={handleSubmit(submit)} className="space-y-4 rounded-card bg-white p-4 shadow-card" noValidate>
        <Input label="Poora naam" autoComplete="name" {...register('name', { required: 'Apna naam daalo', minLength: { value: 2, message: 'Naam bahut chhota hai' } })} error={errors.name?.message} />
        <Input label="Email (optional)" type="email" autoComplete="email" {...register('email', { pattern: { value: /^\S+@\S+\.\S+$/, message: 'Sahi email daalo' } })} error={errors.email?.message} />
        <Input label="Mobile number" value={user.mobile ? `+91 ${user.mobile}` : ''} disabled hint="Mobile number badalne ke liye support se baat karo" readOnly />
        <Button type="submit" full size="lg" loading={loading}>Save karo</Button>
      </form>
    </div>
  );
}
