import { useRef } from 'react';
import { useI18n } from '../i18n';

export default function PlateGallery({ plates, selectedId, onSelect }) {
  const { t } = useI18n();
  const trackRef = useRef(null);

  const withThumbs = plates.filter((p) => p.thumbnailUrl);
  if (withThumbs.length === 0) return null;

  const scroll = (dir) => {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({ left: dir * 120, behavior: 'smooth' });
  };

  return (
    <div className="bg-surface border border-border rounded-[10px] px-3 py-3 flex flex-col gap-2">
      <h3 className="text-[0.7rem] uppercase tracking-[0.1em] text-muted font-bold m-0">{t('gallery.title')}</h3>
      <div className="flex items-center gap-1">
        {/* Left arrow */}
        <button
          className="shrink-0 w-6 h-6 flex items-center justify-center bg-surface-2 border border-border rounded text-muted text-xs cursor-pointer hover:bg-accent hover:text-black hover:border-accent transition-colors duration-100"
          onClick={() => scroll(-1)}
        >
          ‹
        </button>

        {/* Scrollable track */}
        <div
          ref={trackRef}
          className="flex gap-1.5 overflow-x-auto scroll-smooth scrollbar-none flex-1"
        >
          {withThumbs.map((plate) => (
            <button
              key={plate.id}
              onClick={() => onSelect(plate.id)}
              className={`shrink-0 w-[72px] h-[72px] rounded-[6px] overflow-hidden border-2 cursor-pointer transition-all duration-150 p-0 bg-transparent ${
                selectedId === plate.id
                  ? 'border-accent shadow-[0_0_8px_rgba(245,158,11,0.35)]'
                  : 'border-border hover:border-accent-dim'
              }`}
              title={t('gallery.plate', { n: plate.index })}
            >
              <img
                src={plate.thumbnailUrl}
                alt={t('gallery.plate', { n: plate.index })}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>

        {/* Right arrow */}
        <button
          className="shrink-0 w-6 h-6 flex items-center justify-center bg-surface-2 border border-border rounded text-muted text-xs cursor-pointer hover:bg-accent hover:text-black hover:border-accent transition-colors duration-100"
          onClick={() => scroll(1)}
        >
          ›
        </button>
      </div>

      {/* Selected plate label */}
      {selectedId && (
        <div className="text-[0.72rem] text-muted font-mono text-center">
          {t('gallery.plate', { n: withThumbs.find((p) => p.id === selectedId)?.index ?? '—' })}
        </div>
      )}
    </div>
  );
}
