import { useCallback, useState } from 'react';
import { useI18n } from '../i18n';

export default function DropZone({ onFiles, express = false, compact = false }) {
  const { t } = useI18n();
  const [dragging, setDragging] = useState(false);

  const handle = useCallback(
    (files) => {
      const valid = Array.from(files).filter((f) =>
        f.name.toLowerCase().endsWith('.3mf')
      );
      if (valid.length) onFiles(valid, express);
    },
    [onFiles, express]
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      handle(e.dataTransfer.files);
    },
    [handle]
  );

  const onDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = () => setDragging(false);

  const onInput = (e) => handle(e.target.files);

  const baseClasses = `flex items-center justify-center border-2 border-dashed rounded-[10px] cursor-pointer transition-all duration-200 text-center${compact ? ' flex-1' : ''}`;

  if (express) {
    return (
      <label
        className={`${baseClasses} flex-row flex-wrap gap-2 px-5 ${compact ? 'py-2.5 min-h-0' : 'py-4 min-h-[72px]'} ${
          dragging ? 'border-accent bg-surface-hover' : 'border-accent-dim bg-surface-accent'
        } hover:border-accent hover:bg-surface-hover`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <input type="file" accept=".3mf" className="hidden" onChange={onInput} />
        <span className={compact ? 'text-base order-[-1]' : 'text-[1.4rem] order-[-1]'}>⚡</span>
        <span className={`font-extrabold tracking-[0.08em] uppercase text-accent ${compact ? 'text-[0.72rem]' : 'text-[0.85rem]'}`}>
          {compact ? t('drop.expressCompact') : t('drop.express')}
        </span>
        {!compact && <span className="text-[0.75rem] italic text-muted">{t('drop.expressLabel')}</span>}
      </label>
    );
  }

  return (
    <label
      className={`${baseClasses} flex-col gap-1.5 ${compact ? 'px-4 py-2.5 min-h-0' : 'px-6 py-7 min-h-[120px]'} ${
        dragging ? 'border-accent bg-surface-hover' : 'border-border bg-surface'
      } hover:border-accent hover:bg-surface-hover`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <input type="file" accept=".3mf" multiple className="hidden" onChange={onInput} />
      {compact ? (
        <>
          <span className="text-base">📂</span>
          <span className="text-[0.72rem] font-bold tracking-[0.06em] uppercase text-text">{t('drop.addMore')}</span>
        </>
      ) : (
        <>
          <span className="text-[2rem] mb-1">📂</span>
          <span className="text-[0.95rem] font-bold tracking-[0.06em] uppercase text-text">{t('drop.title')}</span>
          <span className="text-[0.75rem] text-muted italic">{t('drop.subtitle')}</span>
        </>
      )}
    </label>
  );
}
