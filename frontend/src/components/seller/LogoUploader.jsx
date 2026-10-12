import { useRef, useState } from 'react';
import { Camera, Loader2, Store } from 'lucide-react';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';
import { productService } from '../../services/productService';
import { compressImage } from '../../utils/image';

export default function LogoUploader({ logoUrl, onDone }) {
  const toast = useToast();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const d = await productService.uploadLogo(await compressImage(file, 600));
      onDone(d.logoUrl); toast.success('Logo update ho gaya');
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col items-center gap-4 pt-2">
      <span className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl bg-brand-50 text-brand-600">
        {logoUrl ? <img src={logoUrl} alt="Store logo" className="h-full w-full object-cover" /> : <Store className="h-12 w-12" />}
      </span>
      <Button variant="outline" size="lg" onClick={() => input.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}{logoUrl ? 'Logo badlo' : 'Logo upload karo'}
      </Button>
      <p className="text-center text-xs text-ink-mute">Square photo sabse acchi dikhti hai. JPG, PNG ya WebP.</p>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files[0]); e.target.value = ''; }} />
    </div>
  );
}
