import { useI18n } from '../i18n';
import { formatDuration } from '../utils/parse3mf';

export default function Stats({ stats }) {
  const { t } = useI18n();
  const { totalSeconds, totalPlates, slotTotals } = stats;

  return (
    <div className="bg-surface border border-border rounded-[10px] px-[18px] py-4 flex flex-col gap-4">
      <section className="flex flex-col gap-2.5">
        <h3 className="text-[0.7rem] uppercase tracking-[0.1em] text-muted font-bold m-0">{t('stats.title')}</h3>
        <div className="grid grid-cols-2 gap-2">
          <StatItem label={t('stats.duration')} value={formatDuration(totalSeconds)} />
          <StatItem label={t('stats.plates')} value={String(totalPlates)} />
        </div>
      </section>

      {Object.keys(slotTotals).length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h3 className="text-[0.7rem] uppercase tracking-[0.1em] text-muted font-bold m-0">{t('stats.filament')}</h3>
          <div className="flex flex-col gap-1.5">
            {Object.entries(slotTotals).map(([id, data]) => (
              <div key={id} className="flex items-center gap-2 text-[0.8rem]">
                <span
                  className="w-[11px] h-[11px] rounded-[3px] border border-white/12 shrink-0"
                  style={{ background: normalizeColor(data.color) }}
                  title={data.type}
                />
                <span className="text-muted w-[42px] shrink-0 text-[0.75rem]">{t('stats.slot')} {id}</span>
                <span className="font-mono text-text-dim text-[0.78rem] min-w-[50px]">
                  {data.usedM.toFixed(2)}m
                </span>
                <span className="font-mono text-text-dim text-[0.78rem] min-w-[50px]">
                  {data.usedG.toFixed(2)}g
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatItem({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.7rem] text-muted">{label}</span>
      <span className="font-mono text-[1.1rem] font-bold text-accent">{value}</span>
    </div>
  );
}

function normalizeColor(raw) {
  if (!raw) return '#888';
  const hex = raw.replace('#', '');
  if (hex.length === 8) return `#${hex.slice(0, 6)}`;
  return raw;
}
