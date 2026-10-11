import { useRef } from 'react';
import { Camera, X, RotateCw, Star, Video, Loader2 } from 'lucide-react';
import { productService } from '../../services/productService';
import { compressImage } from '../../utils/image';
import { useToast } from '../ui/Toast';
import { cn } from '../../utils/cn';

export const ANGLES = [['FRONT', 'Front'], ['BACK', 'Back'], ['SIDE', 'Side'], ['PACKAGING', 'Packaging'], ['SIZE_CHART', 'Size / measurement'], ['OTHER', 'Other']];
const SUGGEST = ['FRONT', 'BACK', 'SIDE', 'PACKAGING'];
const MAX_IMAGES = 8;
const MAX_VIDEO_MB = 30;
let seq = 0;
const nextKey = () => `k${Date.now()}-${seq++}`;

// images: [{ key, url?, publicId?, thumb?, preview?, angle, uploading?, progress?, error?, file? }]
export function ImageUploader({ images, setImages }) {
  const toast = useToast();
  const input = useRef(null);
  const patch = (key, p) => setImages((s) => s.map((i) => (i.key === key ? { ...i, ...p } : i)));

  const send = async (key, file) => {
    patch(key, { uploading: true, progress: 0, error: null });
    try {
      const small = await compressImage(file);
      const d = await productService.uploadImage(small, (progress) => patch(key, { progress }));
      patch(key, { uploading: false, url: d.url, publicId: d.publicId, width: d.width, height: d.height, thumb: d.thumb, file: undefined });
    } catch (e) {
      patch(key, { uploading: false, error: e.message });
    }
  };

  const add = (fileList) => {
    const files = [...fileList];
    const room = MAX_IMAGES - images.length;
    if (files.length > room) toast.error(`Maximum ${MAX_IMAGES} photos. ${room > 0 ? `Sirf ${room} aur add ho sakti hain.` : ''}`);
    const used = new Set(images.map((i) => i.angle));
    const entries = files.slice(0, Math.max(0, room)).map((file) => {
      const angle = SUGGEST.find((a) => !used.has(a)) || 'OTHER';
      used.add(angle);
      return { key: nextKey(), angle, file, preview: URL.createObjectURL(file), uploading: true, progress: 0 };
    });
    setImages((s) => [...s, ...entries]);
    entries.forEach((e) => send(e.key, e.file));
  };

  const setAngle = (key, angle) => setImages((s) => s.map((i) => {
    if (i.key === key) return { ...i, angle };
    return angle === 'FRONT' && i.angle === 'FRONT' ? { ...i, angle: 'OTHER' } : i; // only one Front photo
  }));
  const makeCover = (key) => setImages((s) => { const it = s.find((i) => i.key === key); return [it, ...s.filter((i) => i.key !== key)]; });
  const remove = (key) => setImages((s) => s.filter((i) => i.key !== key));

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((img, idx) => (
          <div key={img.key} className="overflow-hidden rounded-xl border border-surface-line bg-white">
            <div className="relative aspect-square bg-surface-alt">
              <img src={img.thumb || img.preview} alt="" className={cn('h-full w-full object-cover', img.uploading && 'opacity-50')} />
              {idx === 0 && <span className="absolute left-1.5 top-1.5 rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">COVER</span>}
              <button type="button" onClick={() => remove(img.key)} aria-label="Photo hatao" className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-ink/70 text-white"><X className="h-4 w-4" /></button>
              {img.uploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs font-bold"><Loader2 className="h-6 w-6 animate-spin text-brand-700" />{img.progress}%</div>
              )}
              {img.error && (
                <button type="button" onClick={() => send(img.key, img.file)} className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/90 px-2 text-center text-xs font-semibold text-danger">
                  <RotateCw className="h-5 w-5" />{img.error}<span className="underline">Dobara try karo</span>
                </button>
              )}
            </div>
            <div className="space-y-1 p-2">
              <select value={img.angle} onChange={(e) => setAngle(img.key, e.target.value)} aria-label="Photo ka angle" className="h-10 w-full rounded-lg border border-surface-line bg-white px-2 text-xs font-semibold">
                {ANGLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              {idx > 0 && <button type="button" onClick={() => makeCover(img.key)} className="flex h-9 w-full items-center justify-center gap-1 text-xs font-semibold text-brand-700"><Star className="h-3.5 w-3.5" />Cover banao</button>}
            </div>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <button type="button" onClick={() => input.current?.click()}
            className="flex aspect-square min-h-[120px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-600 text-sm font-semibold text-brand-700">
            <Camera className="h-7 w-7" />Photo jodo<span className="text-xs font-medium text-ink-mute">{images.length}/{MAX_IMAGES}</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/*" multiple className="hidden"
        onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
    </div>
  );
}

// video: { url, publicId, durationSec?, uploading?, progress? } | null
export function VideoUploader({ video, setVideo }) {
  const toast = useToast();
  const input = useRef(null);

  const pick = async (file) => {
    if (!file) return;
    if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) { toast.error('Sirf MP4 ya WebM video chalegi'); return; }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) { toast.error(`Video ${MAX_VIDEO_MB} MB se chhoti honi chahiye`); return; }
    setVideo({ uploading: true, progress: 0 });
    try {
      const d = await productService.uploadVideo(file, (progress) => setVideo({ uploading: true, progress }));
      setVideo({ url: d.url, publicId: d.publicId, durationSec: d.durationSec, poster: d.poster });
    } catch (e) { setVideo(null); toast.error(e.message); }
  };

  if (video?.uploading) {
    return <div className="flex h-24 items-center justify-center gap-3 rounded-xl border border-surface-line bg-white text-sm font-semibold"><Loader2 className="h-5 w-5 animate-spin text-brand-700" />Video upload ho rahi hai… {video.progress}%</div>;
  }
  if (video?.url) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-surface-line bg-black">
        <video src={video.url} poster={video.poster} controls playsInline preload="metadata" className="max-h-64 w-full object-contain" />
        <button type="button" onClick={() => setVideo(null)} aria-label="Video hatao" className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-ink/70 text-white"><X className="h-5 w-5" /></button>
      </div>
    );
  }
  return (
    <>
      <button type="button" onClick={() => input.current?.click()} className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-surface-line text-sm font-semibold text-ink-soft">
        <Video className="h-6 w-6" />Video jodo (optional) · max {MAX_VIDEO_MB} MB
      </button>
      <input ref={input} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => { pick(e.target.files[0]); e.target.value = ''; }} />
    </>
  );
}
