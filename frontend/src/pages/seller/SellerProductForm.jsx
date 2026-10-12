import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { Plus, Trash2, Info, ShieldCheck, Lock } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import Switch from '../../components/ui/Switch';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { ImageUploader, VideoUploader } from '../../components/seller/MediaUploader';
import { useToast } from '../../components/ui/Toast';
import { productService } from '../../services/productService';
import { categoryService } from '../../services/customerService';

const numOrNull = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
const Section = ({ title, hint, children }) => (
  <section className="rounded-card bg-white p-4 shadow-card">
    <h2 className="text-base font-extrabold">{title}</h2>
    {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
    <div className="mt-4 space-y-4">{children}</div>
  </section>
);

export default function SellerProductForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { seller } = useOutletContext();
  const navigate = useNavigate();
  const toast = useToast();
  const topRef = useRef(null);

  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState([]);
  const [video, setVideo] = useState(null);
  const [tree, setTree] = useState([]);
  const [parentId, setParentId] = useState('');
  const [subId, setSubId] = useState('');
  const [catError, setCatError] = useState('');
  const [hasVariants, setHasVariants] = useState(false);
  const [meta, setMeta] = useState(null);

  const form = useForm({ defaultValues: { title: '', brand: '', description: '', basePrice: '', mrp: '', weightGrams: '', codAvailable: true, variants: [{ size: '', color: '', stock: '', price: '' }], specs: [] } });
  const { register, control, handleSubmit, reset, setError, watch, formState: { errors } } = form;
  const variants = useFieldArray({ control, name: 'variants' });
  const specs = useFieldArray({ control, name: 'specs' });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const t = (await categoryService.tree()).categories;
        if (!alive) return;
        setTree(t);
        if (editing) {
          const p = (await productService.mineOne(id)).product;
          if (!alive) return;
          setMeta({ status: p.status, isVerified: p.isVerified, rejectionReason: p.rejectionReason });
          if (p.parentCategoryId) { setParentId(p.parentCategoryId); setSubId(p.categoryId); } else { setParentId(p.categoryId); }
          setImages(p.images.map((i, n) => ({ key: `e${n}`, ...i })));
          setVideo(p.video);
          setHasVariants(p.variants.length > 1 || p.variants.some((v) => v.size || v.color));
          reset({
            title: p.title, brand: p.brand || '', description: p.description, basePrice: p.basePrice, mrp: p.mrp, weightGrams: p.weightGrams ?? '', codAvailable: p.codAvailable,
            variants: p.variants.map((v) => ({ variantId: v.id, size: v.size || '', color: v.color || '', stock: v.stock, price: v.price ?? '' })),
            specs: p.specifications,
          });
        }
      } catch (e) { toast.error(e.message); navigate('/seller/products', { replace: true }); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (seller.status !== 'APPROVED') {
    return <div className="rounded-card bg-white shadow-card"><EmptyState icon={Lock} title="Approval ke baad product jod paoge" text="Aapka seller account abhi approve nahi hua hai."
      action={<Link to="/seller/dashboard"><Button>Dashboard par jao</Button></Link>} /></div>;
  }
  if (loading) return <div className="space-y-3"><Skeleton className="h-10 w-48" /><Skeleton className="h-40 w-full rounded-card" /><Skeleton className="h-60 w-full rounded-card" /></div>;

  const children = tree.find((c) => c.id === parentId)?.children || [];
  const categoryId = children.length ? subId : parentId;
  const price = Number(watch('basePrice')); const mrp = Number(watch('mrp'));
  const off = mrp > price && price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const submit = handleSubmit(async (v) => {
    if (!categoryId) { setCatError('Category aur sub-category chuno'); toast.error('Category chuno'); scrollTop(); return; }
    setCatError('');
    if (!images.length) { toast.error('Kam se kam ek asli photo daalo'); scrollTop(); return; }
    if (images.some((i) => i.uploading)) { toast.error('Photos upload hone tak ruko'); return; }
    if (images.some((i) => i.error || !i.url)) { toast.error('Kuch photos upload nahi hui. Dobara try karo ya hata do.'); return; }
    if (video?.uploading) { toast.error('Video upload hone tak ruko'); return; }

    const payload = {
      title: v.title, categoryId, brand: v.brand || undefined, description: v.description,
      specifications: v.specs.filter((s) => s.label.trim() && s.value.trim()).map((s) => ({ label: s.label, value: s.value })),
      basePrice: Number(v.basePrice), mrp: Number(v.mrp), weightGrams: numOrNull(v.weightGrams), codAvailable: Boolean(v.codAvailable),
      images: images.map((i) => ({ url: i.url, publicId: i.publicId, angle: i.angle, width: i.width || undefined, height: i.height || undefined })),
      video: video?.url ? { url: video.url, publicId: video.publicId, durationSec: video.durationSec || undefined } : null,
      variants: (hasVariants ? v.variants : v.variants.slice(0, 1)).map((x) => ({
        id: x.variantId || undefined, size: hasVariants ? x.size || undefined : undefined, color: hasVariants ? x.color || undefined : undefined,
        price: hasVariants ? numOrNull(x.price) : null, stock: Number(x.stock || 0),
      })),
    };
    setSaving(true);
    try {
      if (editing) await productService.update(id, payload); else await productService.create(payload);
      toast.success(editing ? 'Product update ho gaya' : 'Product review ke liye bhej diya gaya');
      navigate('/seller/products', { replace: true });
    } catch (e) {
      if (e.fields) {
        Object.entries(e.fields).forEach(([k, m]) => { if (['title', 'description', 'basePrice', 'mrp', 'brand'].includes(k)) setError(k, { message: m[0] }); });
        toast.error(Object.values(e.fields).flat()[0]);
        scrollTop();
      } else toast.error(e.message);
    } finally { setSaving(false); }
  });

  return (
    <div className="mx-auto max-w-3xl pb-24 lg:pb-0">
      <div ref={topRef} />
      <PageHeader title={editing ? 'Product edit karo' : 'Naya product'} backTo="/seller/products" />

      {meta && (
        <div className="mb-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={meta.status === 'ACTIVE' ? 'green' : meta.status === 'REJECTED' ? 'red' : 'amber'}>{{ ACTIVE: 'Live', REJECTED: 'Reject hua', PENDING_REVIEW: 'Review mein' }[meta.status] || meta.status}</Badge>
            {meta.isVerified && <Badge tone="green"><ShieldCheck className="h-3 w-3" />Verified Product</Badge>}
          </div>
          {meta.rejectionReason && <p className="rounded-xl bg-red-50 p-3 text-sm text-danger">Admin ka note: {meta.rejectionReason}</p>}
          <p className="flex gap-2 rounded-xl bg-marigold-50 p-3 text-xs text-amber-800"><Info className="h-4 w-4 shrink-0" />Title, description, category ya photos badalne par product dobara review mein jayega aur Verified badge hat jayega. Sirf price ya stock badalne par kuch nahi hota.</p>
        </div>
      )}

      <form onSubmit={submit} noValidate className="space-y-4">
        <Section title="Product ki photos" hint="Asli photos daalo: jo product customer ko milega wahi dikhao. Stock ya internet ki photos mat lagao.">
          <ImageUploader images={images} setImages={setImages} />
          <p className="text-xs text-ink-mute">Pehli photo (COVER) listing mein dikhegi. Front, back, side aur packaging ki photo daaloge to customers ka bharosa badhega.</p>
          <div><p className="mb-2 text-sm font-semibold">Product video</p><VideoUploader video={video} setVideo={setVideo} /></div>
        </Section>

        <Section title="Basic details">
          <Input label="Product ka naam" placeholder="Jaise: Men's Running Shoes" maxLength={120}
            {...register('title', { required: 'Naam daalo', minLength: { value: 5, message: 'Kam se kam 5 akshar' } })} error={errors.title?.message} />
          <Select label="Category" value={parentId} onChange={(e) => { setParentId(e.target.value); setSubId(''); setCatError(''); }} error={!parentId ? catError : undefined}>
            <option value="">Category chuno</option>
            {tree.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          {children.length > 0 && (
            <Select label="Sub-category" value={subId} onChange={(e) => { setSubId(e.target.value); setCatError(''); }} error={catError && parentId ? catError : undefined}>
              <option value="">Sub-category chuno</option>
              {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}
          <Input label="Brand (optional)" maxLength={40} {...register('brand')} />
          <Textarea label="Description" rows={5} maxLength={3000} placeholder="Product ki khaasiyat, material, use, kya milega box mein…"
            {...register('description', { required: 'Description daalo', minLength: { value: 20, message: 'Kam se kam 20 akshar likho' } })} error={errors.description?.message}
            hint={`${(watch('description') || '').length}/3000`} />
        </Section>

        <Section title="Price">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Selling price (₹)" type="number" inputMode="decimal" min={1} step="any"
              {...register('basePrice', { required: 'Price daalo', min: { value: 1, message: '₹1 se zyada' } })} error={errors.basePrice?.message} />
            <Input label="MRP (₹)" type="number" inputMode="decimal" min={1} step="any"
              {...register('mrp', { required: 'MRP daalo', validate: (x) => Number(x) >= Number(watch('basePrice')) || 'MRP price se kam nahi ho sakta' })} error={errors.mrp?.message} />
          </div>
          {off > 0 && <p className="text-sm font-bold text-brand-700">Customer ko {off}% off dikhega</p>}
          <Input label="Weight in grams (optional)" type="number" inputMode="numeric" min={1} {...register('weightGrams')} />
          <Switch label="Cash on Delivery" hint="Is product par COD allow karo" {...register('codAvailable')} />
        </Section>

        <Section title="Stock" hint="Kitne piece bechne ke liye hain?">
          <label className="flex min-h-[44px] items-center gap-3">
            <input type="checkbox" checked={hasVariants} onChange={(e) => setHasVariants(e.target.checked)} className="h-5 w-5 accent-brand-600" />
            <span className="text-sm font-semibold">Is product ke alag-alag size ya colour hain</span>
          </label>
          {!hasVariants ? (
            <Input label="Stock (piece)" type="number" inputMode="numeric" min={0} {...register('variants.0.stock', { required: 'Stock daalo', min: { value: 0, message: '0 se kam nahi' } })} error={errors.variants?.[0]?.stock?.message} />
          ) : (
            <div className="space-y-3">
              {variants.fields.map((f, i) => (
                <div key={f.id} className="rounded-xl border border-surface-line p-3">
                  <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-ink-soft">VARIANT {i + 1}</span>
                    {variants.fields.length > 1 && <button type="button" onClick={() => variants.remove(i)} aria-label="Variant hatao" className="flex h-9 w-9 items-center justify-center rounded-full text-danger"><Trash2 className="h-4 w-4" /></button>}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Size" placeholder="M / 8 / XL" {...register(`variants.${i}.size`)} />
                    <Input label="Colour" placeholder="Black" {...register(`variants.${i}.color`)} />
                    <Input label="Stock" type="number" inputMode="numeric" min={0} {...register(`variants.${i}.stock`, { required: 'Stock daalo', min: { value: 0, message: '0 se kam nahi' } })} error={errors.variants?.[i]?.stock?.message} />
                    <Input label="Alag price (optional)" type="number" inputMode="decimal" min={1} step="any" {...register(`variants.${i}.price`)} />
                  </div>
                </div>
              ))}
              {variants.fields.length < 30 && <Button type="button" variant="outline" onClick={() => variants.append({ size: '', color: '', stock: '', price: '' })}><Plus className="h-4 w-4" />Variant jodo</Button>}
            </div>
          )}
        </Section>

        <Section title="Specifications (optional)" hint="Jaise: Material, Warranty, Size guide">
          {specs.fields.map((f, i) => (
            <div key={f.id} className="flex items-start gap-2">
              <Input label={i === 0 ? 'Naam' : undefined} placeholder="Material" aria-label="Specification name" {...register(`specs.${i}.label`)} />
              <Input label={i === 0 ? 'Value' : undefined} placeholder="Cotton" aria-label="Specification value" {...register(`specs.${i}.value`)} />
              <button type="button" onClick={() => specs.remove(i)} aria-label="Hatao" className={`flex h-12 w-11 shrink-0 items-center justify-center text-danger ${i === 0 ? 'mt-[26px]' : ''}`}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {specs.fields.length < 20 && <Button type="button" variant="outline" onClick={() => specs.append({ label: '', value: '' })}><Plus className="h-4 w-4" />Specification jodo</Button>}
        </Section>

        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-surface-line bg-white p-3 lg:static lg:border-0 lg:bg-transparent lg:p-0">
          <div className="mx-auto flex max-w-3xl gap-3">
            <Link to="/seller/products" className="shrink-0"><Button type="button" variant="outline" size="lg">Cancel</Button></Link>
            <Button type="submit" size="lg" full loading={saving}>{editing ? 'Save karo' : 'Review ke liye bhejo'}</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
