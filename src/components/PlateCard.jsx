import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useI18n } from '../i18n';
import { formatDuration } from '../utils/parse3mf';

export default function PlateCard({ plate, onChange, loopRepeats }) {
  const { t } = useI18n();
  const totalReps = plate.repeats * Math.max(1, loopRepeats);
  const enabled = plate.enabled !== false;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: plate.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : enabled ? 1 : 0.4,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-surface border border-border rounded-[10px] px-4 py-3.5 flex flex-col gap-2.5 transition-colors duration-150 hover:border-accent-dim"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted hover:text-text-dim transition-colors duration-150 text-[0.85rem] select-none"
            title={t('card.dragTitle')}
          >⠿</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onChange({ ...plate, enabled: e.target.checked })}
            className="accent-accent w-3.5 h-3.5 cursor-pointer"
          />
          <div className="bg-accent text-black text-[0.7rem] font-extrabold tracking-[0.08em] uppercase px-[9px] py-[3px] rounded-[4px]">
            {plate.label || `${t('card.plate', { n: plate.index })}`}
          </div>
        </div>
        <div className="font-mono text-[0.85rem] text-muted">{formatDuration(plate.prediction)}</div>
      </div>

      {/* Plate name */}
      <div className="text-[0.75rem] text-muted leading-[1.3]">
        <span className="text-text-dim">{t('card.plate', { n: plate.index })}</span>
        {plate.plateName && <span>: {plate.plateName}</span>}
      </div>

      {/* Thumbnail */}
      {plate.thumbnailUrl && (
        <img
          src={plate.thumbnailUrl}
          alt={t('card.plate', { n: plate.index })}
          className="w-full rounded-[6px] border border-border object-cover max-h-[160px]"
        />
      )}

      {/* Filament slots */}
      <div className="flex flex-col gap-[5px]">
        {plate.filaments.length === 0 && (
          <span className="text-[0.75rem] text-muted italic">{t('card.noFilament')}</span>
        )}
        {plate.filaments.map((f) => (
          <div key={f.id} className="flex items-center gap-[7px] text-[0.78rem]">
            <span
              className="w-3 h-3 rounded-[3px] border border-white/15 shrink-0"
              style={{ background: normalizeColor(f.color) }}
            />
            <span className="text-muted w-[38px] shrink-0">{t('card.slot', { n: f.id })}</span>
            <span className="text-text-dim text-[0.72rem] w-[42px] shrink-0">{f.type}</span>
            <span className="font-mono text-text-dim text-[0.75rem]">
              {f.usedM.toFixed(2)}m / {f.usedG.toFixed(2)}g
            </span>
          </div>
        ))}
      </div>

      {/* Repeats control */}
      <div className="flex items-center gap-2.5 border-t border-border pt-2.5 flex-wrap">
        <label className="text-[0.72rem] uppercase tracking-[0.06em] text-muted font-semibold">{t('card.repeats')}</label>
        <div className="flex items-center border border-border rounded-[6px] overflow-hidden">
          <button
            className="bg-surface-2 border-none text-text w-7 h-7 text-base cursor-pointer transition-colors duration-150 leading-none hover:enabled:bg-accent hover:enabled:text-black disabled:opacity-35 disabled:cursor-not-allowed"
            onClick={() => onChange({ ...plate, repeats: Math.max(1, plate.repeats - 1) })}
            disabled={plate.repeats <= 1}
          >
            −
          </button>
          <span className="font-mono text-[0.9rem] font-bold w-[30px] text-center text-accent">{plate.repeats}</span>
          <button
            className="bg-surface-2 border-none text-text w-7 h-7 text-base cursor-pointer transition-colors duration-150 leading-none hover:enabled:bg-accent hover:enabled:text-black"
            onClick={() => onChange({ ...plate, repeats: plate.repeats + 1 })}
          >
            +
          </button>
        </div>
        {totalReps > 1 && (
          <span className="text-[0.72rem] text-muted font-mono ml-auto">{t('card.loopTotal', { loop: loopRepeats, total: totalReps })}</span>
        )}
      </div>
    </div>
  );
}

function normalizeColor(raw) {
  if (!raw) return '#888';
  const hex = raw.replace('#', '');
  if (hex.length === 8) return `#${hex.slice(0, 6)}`;
  return raw;
}
