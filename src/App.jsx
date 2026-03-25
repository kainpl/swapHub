import { useState, useCallback, useMemo, useRef } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Toaster, toast } from 'sonner';
import { useI18n } from './i18n';
import { useTheme } from './theme';
import { parse3mf, ParseError, computeStats } from './utils/parse3mf';
import { generateSwap } from './utils/generate';
import { createGenerateController, AbortError } from './utils/generateController';
import DropZone from './components/DropZone';
import PlateCard from './components/PlateCard';
import Stats from './components/Stats';
import PrintQueue from './components/PrintQueue';
import PlateGallery from './components/PlateGallery';
import LangSwitcher from './components/LangSwitcher';
import ThemeSwitcher from './components/ThemeSwitcher';
import GuideModal from './components/GuideModal';

const DEFAULT_LOOP = 1;

function useLocalState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch { return defaultValue; }
  });
  const set = useCallback((v) => {
    setValue((prev) => {
      const next = typeof v === 'function' ? v(prev) : v;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);
  return [value, set];
}

export default function App() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [plates, setPlates] = useState([]);
  const [originalZip, setOriginalZip] = useState(null);
  const [loopRepeats, setLoopRepeats] = useState(DEFAULT_LOOP);
  const [customName, setCustomName] = useState('');
  const [status, setStatus] = useState({ type: 'idle', msg: '' });
  const [generating, setGenerating] = useState(false);
  const [log, setLog] = useState([]);
  const [selectedPlateId, setSelectedPlateId] = useState(null);
  const [fileCount, setFileCount] = useState(0);
  const [disableMechModeCheck, setDisableMechModeCheck] = useLocalState('opt_mmfc', true);
  const [disableMechModeCheckAll, setDisableMechModeCheckAll] = useLocalState('opt_mmfc_all', false);
  const [disableDynamicFlow, setDisableDynamicFlow] = useLocalState('opt_dfc', true);
  const [guideOpen, setGuideOpen] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, step: '' });
  const [paused, setPaused] = useState(false);
  const controllerRef = useRef(null);

  const addLog = (msg) => setLog((l) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...l]);

  const handlePause = () => {
    if (!controllerRef.current) return;
    controllerRef.current.pause();
    setPaused(true);
  };

  const handleResume = () => {
    if (!controllerRef.current) return;
    controllerRef.current.resume();
    setPaused(false);
  };

  const handleStop = () => {
    if (!controllerRef.current) return;
    controllerRef.current.stop();
    setPaused(false);
  };

  const doGenerate = useCallback(async (zip, plts, loop, name, coverPlate, opts = {}) => {
    const ctrl = createGenerateController();
    controllerRef.current = ctrl;
    setGenerating(true);
    setProgress({ percent: 0, step: 'reading' });
    setPaused(false);
    addLog(t('log.generating', { n: plts.length, loop }));
    try {
      const blob = await generateSwap(zip, plts, loop, name, coverPlate, {
        ...opts,
        controller: ctrl,
        onProgress: (pct, step) => setProgress({ percent: pct, step }),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = opts.express ? `${name || 'output'}.3mf` : `${name || 'output'}.swap.3mf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addLog(t('log.downloaded', { name: a.download }));
    } catch (err) {
      if (err instanceof AbortError) {
        addLog(t('progress.cancelled'));
      } else {
        toast.error(t('status.genFail'), { description: err.message });
        addLog(t('log.genError', { msg: err.message }));
      }
    }
    setGenerating(false);
    setProgress({ percent: 0, step: '' });
    controllerRef.current = null;
  }, [t]);

  const handleFiles = useCallback(async (files, express = false) => {
    setStatus({ type: 'loading', msg: t('status.parsing') });

    const newPlates = [];
    let zip = null;
    let localFileCount = fileCount;

    try {
      for (const file of files) {
        addLog(t('log.loading', { name: file.name }));
        const result = await parse3mf(file);
        const fileLetter = String.fromCharCode(65 + localFileCount);
        localFileCount++;
        result.plates.forEach((plate, i) => {
          plate.label = `${fileLetter}${result.plates.length > 1 ? i + 1 : ''}`;
          plate.enabled = true;
        });
        newPlates.push(...result.plates);
        zip = result.zip;
      }

      setFileCount(localFileCount);

      setPlates((prev) => {
        const merged = [...prev, ...newPlates];
        if (!prev.length && newPlates.length > 0) {
          setSelectedPlateId(newPlates[0].id);
        }
        return merged;
      });

      setOriginalZip(zip);

      setCustomName((prev) => {
        if (!prev) return files[0].name.replace(/\.3mf$/i, '');
        return 'mix';
      });

      addLog(t('log.added', { plates: newPlates.length, files: files.length }));
      setStatus({ type: 'ready', msg: '' });

      if (express && zip) {
        await doGenerate(zip, newPlates, DEFAULT_LOOP, files[0].name.replace(/\.3mf$/i, ''), null, { express: true });
      }
    } catch (err) {
      const msg = err instanceof ParseError ? t(err.code, err.params) : err.message;
      toast.error(msg);
      addLog(t('log.error', { msg }));
    }
  }, [doGenerate, fileCount, t]);

  const handleGenerate = () => {
    const active = plates.filter((p) => p.enabled);
    if (active.length === 0) return;
    const templateZip = originalZip || active[0].zip;
    const coverPlate = active.find((p) => p.id === selectedPlateId) || active[0];
    doGenerate(templateZip, active, loopRepeats, customName, coverPlate, { disableMechModeCheck, disableMechModeCheckAll, disableDynamicFlow });
  };

  const handleReset = () => {
    setPlates([]);
    setOriginalZip(null);
    setCustomName('');
    setLoopRepeats(DEFAULT_LOOP);
    setSelectedPlateId(null);
    setFileCount(0);
    setStatus({ type: 'idle', msg: '' });
    addLog(t('log.reset'));
  };

  const updatePlate = (updated) => {
    setPlates((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setPlates((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const plateIds = useMemo(() => plates.map((p) => p.id), [plates]);

  const activePlates = plates.filter((p) => p.enabled);
  const stats = computeStats(activePlates, loopRepeats);
  const hasPlates = plates.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <Toaster
        theme={theme}
        position="top-center"
        richColors
      />
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-2 border-b border-border bg-surface sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <span className="text-[1.3rem] font-extrabold tracking-[-0.02em] leading-none">
            <span className="text-text">swap</span>
            <span className="bg-accent text-black px-[5px] py-[1px] rounded-[4px] ml-[1px]">Hub</span>
          </span>
          <span className="text-[0.7rem] text-muted font-medium tracking-[0.04em] uppercase self-end pb-0.5">{t('header.subtitle')}</span>
        </div>
        <div className="flex items-center gap-2">
          {hasPlates && (
            <button
              className="bg-transparent border border-border text-muted text-[0.75rem] px-3 h-8 rounded-[6px] cursor-pointer transition-all duration-150 tracking-[0.04em] hover:border-[#e55] hover:text-[#e55]"
              onClick={handleReset}
            >
              ✕ {t('header.reset')}
            </button>
          )}
          <ThemeSwitcher />
          <LangSwitcher />
        </div>
      </header>

      {/* Main layout */}
      {!hasPlates ? (
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="flex flex-col gap-4 max-w-[520px] w-full">
            <DropZone onFiles={handleFiles} express={false} />
            <DropZone onFiles={handleFiles} express={true} />

            {status.type === 'loading' && (
              <div className="flex items-center gap-2.5 text-[0.85rem] text-muted px-4 py-3 bg-surface border border-border rounded-lg">
                <span className="inline-block w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> {status.msg}
              </div>
            )}

            <div className="bg-surface border border-border rounded-[10px] px-4 py-3.5">
              <h4 className="text-[0.8rem] font-bold mb-2 text-text-dim">{t('info.security.title')}</h4>
              <p className="text-[0.8rem] text-muted m-0 leading-[1.5]">
                {t('info.security.text')}
              </p>
            </div>

            <div className="bg-surface border border-border rounded-[10px] px-4 py-3.5">
              <h4 className="text-[0.8rem] font-bold mb-2 text-text-dim">{t('info.howto.title')}</h4>
              <p
                className="text-[0.8rem] text-muted m-0 leading-[1.5] [&_strong]:text-text-dim [&_code]:font-mono [&_code]:bg-surface-2 [&_code]:px-[5px] [&_code]:py-px [&_code]:rounded-[3px] [&_code]:text-[0.78rem] [&_code]:text-accent"
                dangerouslySetInnerHTML={{ __html: t('info.howto.text1') }}
              />
              <p
                className="text-[0.8rem] text-muted m-0 leading-[1.5] mt-1.5 [&_strong]:text-text-dim [&_code]:font-mono [&_code]:bg-surface-2 [&_code]:px-[5px] [&_code]:py-px [&_code]:rounded-[3px] [&_code]:text-[0.78rem] [&_code]:text-accent"
                dangerouslySetInnerHTML={{ __html: t('info.howto.text2') }}
              />
            </div>
          </div>
        </main>
      ) : (
        <main className="grid grid-cols-[280px_1fr_280px] max-[720px]:grid-cols-1 flex-1 items-start">
          {/* Sidebar */}
          <aside className="border-r border-border px-4 py-5 flex flex-col gap-3.5 sticky top-[49px] max-h-[calc(100vh-98px)] min-h-[calc(100vh-98px)] overflow-y-auto">
            <Stats stats={stats} />
            <PrintQueue plates={activePlates} loopRepeats={loopRepeats} />

            {/* Loop repeats */}
            <div className="bg-surface border border-border rounded-[10px] px-4 py-3.5 flex flex-col gap-2">
              <h3 className="text-[0.7rem] uppercase tracking-[0.1em] text-muted font-bold m-0">{t('loop.title')}</h3>
              <p className="text-[0.75rem] text-muted m-0 leading-[1.4]">
                {t('loop.desc')}
              </p>
              <div className="flex items-center border border-border rounded-[6px] overflow-hidden w-fit">
                <button
                  className="bg-surface-2 border-none text-text w-8 h-8 text-[1.1rem] cursor-pointer transition-colors duration-150 hover:enabled:bg-accent hover:enabled:text-black disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={() => setLoopRepeats((v) => Math.max(1, v - 1))}
                  disabled={loopRepeats <= 1}
                >−</button>
                <span className="font-mono text-base font-bold w-10 text-center text-accent">{loopRepeats}</span>
                <button
                  className="bg-surface-2 border-none text-text w-8 h-8 text-[1.1rem] cursor-pointer transition-colors duration-150 hover:enabled:bg-accent hover:enabled:text-black"
                  onClick={() => setLoopRepeats((v) => v + 1)}
                >+</button>
              </div>
            </div>

            {/* Custom file name */}
            <div className="bg-surface border border-border rounded-[10px] px-4 py-3.5 flex flex-col gap-2">
              <h3 className="text-[0.7rem] uppercase tracking-[0.1em] text-muted font-bold m-0">{t('filename.title')}</h3>
              <div className="flex items-center border border-border rounded-[6px] overflow-hidden">
                <input
                  className="flex-1 bg-surface-2 border-none text-text font-mono text-[0.8rem] px-2.5 py-[7px] outline-none min-w-0 focus:bg-surface-hover"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="output"
                />
                <span className="bg-surface text-muted font-mono text-[0.75rem] px-2 py-[7px] border-l border-border whitespace-nowrap">.swap.3mf</span>
              </div>
            </div>

            {/* Options */}
            <div className="bg-surface border border-border rounded-[10px] px-4 py-3.5 flex flex-col gap-2">
              <h3 className="text-[0.7rem] uppercase tracking-[0.1em] text-muted font-bold m-0">{t('options.title')}</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={disableMechModeCheck}
                  onChange={(e) => {
                    setDisableMechModeCheck(e.target.checked);
                    if (!e.target.checked) setDisableMechModeCheckAll(false);
                  }}
                  className="accent-accent w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[0.78rem] text-text-dim">{t('options.mmfc')}</span>
              </label>
              <p className="text-[0.72rem] text-muted m-0 leading-[1.4]">
                {t('options.mmfcDesc')}
              </p>
              {disableMechModeCheck && (
                <label className="flex items-center gap-2 cursor-pointer ml-5">
                  <input
                    type="checkbox"
                    checked={disableMechModeCheckAll}
                    onChange={(e) => setDisableMechModeCheckAll(e.target.checked)}
                    className="accent-accent w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-[0.78rem] text-text-dim">{t('options.mmfcAll')}</span>
                </label>
              )}
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={disableDynamicFlow}
                  onChange={(e) => setDisableDynamicFlow(e.target.checked)}
                  className="accent-accent w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[0.78rem] text-text-dim">{t('options.dynflow')}</span>
              </label>
              <p className="text-[0.72rem] text-muted m-0 leading-[1.4]">
                {t('options.dynflowDesc')}
              </p>
            </div>

            {/* Plate gallery */}
            <PlateGallery
              plates={activePlates}
              selectedId={selectedPlateId}
              onSelect={setSelectedPlateId}
            />

            {/* Generate button */}
            <button
              className="bg-accent text-black border-none rounded-lg px-4 py-3 text-[0.85rem] font-extrabold tracking-[0.04em] cursor-pointer transition-all duration-150 flex items-center justify-center gap-2 hover:enabled:opacity-[0.88] hover:enabled:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleGenerate}
              disabled={generating || activePlates.length === 0}
            >
              {generating ? (
                <><span className="inline-block w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> {t('generate.loading')}</>
              ) : (
                `⬇ ${t('generate.btn')}`
              )}
            </button>
          </aside>

          {/* Content */}
          <section className="p-6">
            <div className="flex flex-col gap-4">
              {/* Compact drop zone to add more files */}
              <div className="flex gap-3">
                <DropZone onFiles={handleFiles} express={false} compact />
                <DropZone onFiles={handleFiles} express={true} compact />
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={plateIds} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3.5">
                    {plates.map((plate) => (
                      <PlateCard
                        key={plate.id}
                        plate={plate}
                        loopRepeats={loopRepeats}
                        onChange={updatePlate}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </section>

          {/* Right sidebar — log */}
          <aside className="border-l border-border px-4 py-5 flex flex-col gap-3.5 sticky top-[49px] max-h-[calc(100vh-99px)] min-h-[calc(100vh-98px)] overflow-y-auto">
            {log.length > 0 && (
              <div className="bg-surface border border-border rounded-[10px] px-4 py-3.5 flex flex-col gap-2">
                <h3 className="text-[0.7rem] uppercase tracking-[0.1em] text-muted font-bold m-0">{t('log.title')}</h3>
                <div className="flex flex-col gap-[3px] max-h-[400px] overflow-y-auto">
                  {log.map((l, i) => <div key={i} className="font-mono text-[0.65rem] text-muted leading-[1.4]">{l}</div>)}
                </div>
              </div>
            )}
          </aside>
        </main>
      )}

      {/* Footer */}
      <footer className="border-t border-border bg-surface px-6 py-2 mt-auto flex items-center gap-3">
        {/* Progress */}
        {generating && (
          <>
            <div className="flex items-center gap-2.5 max-w-[320px] flex-1">
              <div className="flex-1 h-3 bg-surface-2 rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <span className="font-mono text-[0.7rem] text-muted w-[36px] text-right shrink-0">{progress.percent}%</span>
            </div>
            <span className="text-[0.72rem] text-text-dim whitespace-nowrap">{t(`progress.${progress.step}`)}</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={paused ? handleResume : handlePause}
                className="bg-surface-2 border border-border text-muted text-[0.72rem] h-7 px-2.5 rounded-[5px] cursor-pointer transition-all duration-150 hover:text-accent hover:border-accent-dim"
              >
                {paused ? t('progress.resume') : t('progress.pause')}
              </button>
              <button
                onClick={handleStop}
                className="bg-surface-2 border border-border text-muted text-[0.72rem] h-7 px-2.5 rounded-[5px] cursor-pointer transition-all duration-150 hover:text-[#e55] hover:border-[#e55]"
              >
                {t('progress.stop')}
              </button>
            </div>
          </>
        )}

        {/* Guide */}
        <button
          onClick={() => setGuideOpen(true)}
          className="ml-auto bg-surface-2 border border-border text-muted text-[0.78rem] h-8 px-3.5 rounded-[6px] cursor-pointer transition-all duration-150 hover:text-accent hover:border-accent-dim flex items-center gap-1.5"
        >
          {t('footer.guide')}
        </button>
      </footer>

      <GuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
