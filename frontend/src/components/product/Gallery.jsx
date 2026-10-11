import { useRef, useState } from 'react';
import { ImageOff, Play } from 'lucide-react';
import { cn } from '../../utils/cn';

const LABEL = { FRONT: 'Front', BACK: 'Back', SIDE: 'Side', PACKAGING: 'Packaging', SIZE_CHART: 'Size chart', OTHER: '' };

// Swipe on phones (scroll-snap), clickable thumbnails on tablets/desktops. Shows real photos uncropped.
export default function Gallery({ images, video, title }) {
  const ref = useRef(null);
  const [active, setActive] = useState(0);
  const items = [...images.map((i) => ({ type: 'img', ...i })), ...(video ? [{ type: 'video', ...video }] : [])];

  const onScroll = () => { const el = ref.current; if (el) setActive(Math.round(el.scrollLeft / el.clientWidth)); };
  const goTo = (i) => ref.current?.scrollTo({ left: i * ref.current.clientWidth, behavior: 'smooth' });

  if (!items.length) {
    return <div className="flex aspect-square items-center justify-center bg-surface-alt text-ink-mute"><ImageOff className="h-10 w-10" /></div>;
  }
  return (
    <div>
      <div className="relative overflow-hidden bg-white md:rounded-card md:shadow-card">
        <div ref={ref} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar">
          {items.map((it, i) => (
            <div key={it.id || 'video'} className="relative aspect-square w-full shrink-0 snap-center">
              {it.type === 'img'
                ? <img src={it.detail} alt={`${title} ${LABEL[it.angle] || ''}`.trim()} loading={i === 0 ? 'eager' : 'lazy'} className="h-full w-full object-contain" />
                : <video src={it.url} poster={it.poster} controls playsInline preload="metadata" className="h-full w-full bg-black object-contain" />}
              {it.type === 'img' && LABEL[it.angle] && <span className="absolute bottom-3 left-3 rounded-md bg-ink/70 px-2 py-0.5 text-[11px] font-semibold text-white">{LABEL[it.angle]}</span>}
            </div>
          ))}
        </div>
        {items.length > 1 && <span className="absolute right-3 top-3 rounded-pill bg-ink/70 px-2.5 py-1 text-xs font-semibold text-white">{active + 1}/{items.length}</span>}
        {items.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 md:hidden">
            {items.map((_, i) => <span key={i} className={cn('h-1.5 rounded-full transition-all', i === active ? 'w-4 bg-brand-600' : 'w-1.5 bg-ink/30')} />)}
          </div>
        )}
      </div>
      {items.length > 1 && (
        <div className="mt-3 hidden gap-2 overflow-x-auto no-scrollbar md:flex">
          {items.map((it, i) => (
            <button key={it.id || 'video'} onClick={() => goTo(i)} aria-label={`Photo ${i + 1}`}
              className={cn('relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-white', i === active ? 'border-brand-600' : 'border-transparent')}>
              {it.type === 'img' ? <img src={it.thumb} alt="" className="h-full w-full object-cover" />
                : <span className="flex h-full w-full items-center justify-center bg-ink text-white"><Play className="h-5 w-5" /></span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
