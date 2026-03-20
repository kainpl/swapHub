import { useI18n } from '../i18n';

export default function PrintQueue({ plates, loopRepeats }) {
  const { t } = useI18n();
  const loop = Math.max(1, loopRepeats);
  const queue = [];

  for (let l = 0; l < loop; l++) {
    for (const plate of plates) {
      for (let r = 0; r < Math.max(1, plate.repeats); r++) {
        queue.push({ plate, loopIdx: l });
      }
    }
  }

  if (queue.length <= 1) return null;

  const display = queue.slice(0, 40);
  const overflow = queue.length - display.length;

  return (
    <div className="bg-surface border border-border rounded-[10px] px-4 py-3.5 flex flex-col gap-2.5">
      <h3 className="text-[0.7rem] uppercase tracking-[0.1em] text-muted font-bold m-0">{t('queue.title')}</h3>
      <div className="flex flex-wrap gap-1">
        {display.map((item, i) => (
          <span
            key={i}
            className="bg-surface-2 border border-border text-accent font-mono text-[0.72rem] font-bold px-[7px] py-[3px] rounded-[4px] transition-colors duration-100 hover:bg-accent hover:text-black hover:border-accent"
            title={t('queue.plateTitle', { label: item.plate.label || item.plate.index, loop: item.loopIdx + 1 })}
          >
            {item.plate.label || item.plate.index}
          </span>
        ))}
        {overflow > 0 && (
          <span className="text-[0.72rem] text-muted self-center font-mono">{t('queue.more', { n: overflow })}</span>
        )}
      </div>
      <div className="text-[0.72rem] text-muted">{t('queue.total', { n: queue.length })}</div>
    </div>
  );
}
