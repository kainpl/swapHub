import JSZip from 'jszip';

class ParseError extends Error {
  constructor(code, params = {}) {
    super(code);
    this.code = code;
    this.params = params;
  }
}

export { ParseError };

export async function parse3mf(file) {
  let zip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new ParseError('error.invalidFile');
  }

  const sliceInfoFile =
    zip.file('Metadata/slice_info.config') ||
    zip.file('metadata/slice_info.config');

  if (!sliceInfoFile) {
    throw new ParseError('error.notSliced');
  }

  const sliceInfoXml = await sliceInfoFile.async('string');
  const parser = new DOMParser();
  const doc = parser.parseFromString(sliceInfoXml, 'application/xml');

  if (doc.querySelector('parsererror')) {
    throw new ParseError('error.corruptConfig');
  }

  // Extract raw <header> block for reuse in generated files
  const headerEl = doc.querySelector('header');
  let sliceInfoHeader = '';
  if (headerEl) {
    const s = new XMLSerializer();
    sliceInfoHeader = '  ' + s.serializeToString(headerEl) + '\n';
  }

  const plateEls = doc.querySelectorAll('plate');
  if (plateEls.length === 0) {
    throw new ParseError('error.noPlates');
  }

  // Verify printer model — only Bambu Lab N1 is supported
  const firstPlateEl = plateEls[0];
  const printerModelMeta = Array.from(firstPlateEl.querySelectorAll('metadata')).find(
    (m) => m.getAttribute('key') === 'printer_model_id'
  );
  const printerModel = printerModelMeta ? printerModelMeta.getAttribute('value') : null;
  if (printerModel !== 'N1') {
    throw new ParseError('error.wrongPrinter', { model: printerModel || 'unknown' });
  }

  // Parse plate names from model_settings.config
  const plateNames = await parsePlateNames(zip);

  const plates = [];

  for (let idx = 0; idx < plateEls.length; idx++) {
    const plateEl = plateEls[idx];
    const getMeta = (key) => {
      const el = Array.from(plateEl.querySelectorAll('metadata')).find(
        (m) => m.getAttribute('key') === key
      );
      return el ? el.getAttribute('value') : null;
    };

    const index = parseInt(getMeta('index') ?? String(idx + 1));
    const fileName = getMeta('file_name') ?? `plate_${index}.gcode.3mf`;
    let rawPrediction = parseInt(getMeta('slice_prediction') ?? '0');

    // If slice_prediction is missing/zero, try parsing time from gcode content
    if (!rawPrediction) {
      const gcodeTime = await parseTimeFromGcode(zip, index, fileName);
      if (gcodeTime > 0) rawPrediction = gcodeTime;
    }

    const printerModelId = getMeta('printer_model_id') ?? '';
    const nozzleDiameters = getMeta('nozzle_diameters') ?? '';
    const plateName = plateNames[index] ?? '';

    const filaments = [];
    plateEl.querySelectorAll('filament').forEach((f) => {
      const id = parseInt(f.getAttribute('id') ?? '1');
      filaments.push({
        id,
        trayInfoIdx: f.getAttribute('tray_info_idx') ?? '',
        type: f.getAttribute('type') ?? 'PLA',
        color: f.getAttribute('color') ?? '#AAAAAA',
        usedM: parseFloat(f.getAttribute('used_m') ?? '0'),
        usedG: parseFloat(f.getAttribute('used_g') ?? '0'),
      });
    });

    // If no filaments in config, try to infer slot count from keys
    const slotsUsed = new Set();
    if (filaments.length === 0) {
      for (let s = 1; s <= 4; s++) {
        const val = getMeta(`used_m_${s}`);
        if (val !== null) {
          filaments.push({
            id: s,
            type: getMeta(`filament_type_${s}`) ?? 'PLA',
            color: getMeta(`filament_color_${s}`) ?? '#AAAAAA',
            usedM: parseFloat(val),
            usedG: parseFloat(getMeta(`used_g_${s}`) ?? '0'),
          });
          slotsUsed.add(s);
        }
      }
    }

    // Load thumbnail blob URL
    const thumbnailUrl = await loadThumbnail(zip, index, getMeta);

    plates.push({
      id: `plate-${index}-${Date.now()}-${idx}`,
      index,
      fileName,
      prediction: rawPrediction,
      printerModelId,
      nozzleDiameters,
      plateName,
      filaments,
      repeats: 1,
      thumbnailUrl,
      zip,
    });
  }

  // Calculate total filament per slot across all plates
  const slotTotals = {};
  plates.forEach((p) => {
    p.filaments.forEach((f) => {
      if (!slotTotals[f.id]) slotTotals[f.id] = { usedM: 0, usedG: 0, color: f.color, type: f.type };
      slotTotals[f.id].usedM += f.usedM;
      slotTotals[f.id].usedG += f.usedG;
    });
  });

  return { plates, zip, slotTotals, sliceInfoHeader };
}

export function formatDuration(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds)) return '—';
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Parse print time from gcode content (like the original swaplist.app).
 * Looks for "total estimated time: Xd Xh Xm Xs" string inside gcode.
 */
async function parseTimeFromGcode(zip, plateIndex, fileName) {
  const variants = [
    `Metadata/plate_${plateIndex}.gcode`,
    `Metadata/Plate_${plateIndex}.gcode`,
    `Metadata/plate_${plateIndex}.gcode.3mf`,
    `Metadata/Plate_${plateIndex}.gcode.3mf`,
    fileName.includes('/') ? fileName : `Metadata/${fileName}`,
  ];

  for (const variant of variants) {
    const f = zip.file(variant);
    if (!f) continue;

    // Read only first 100KB to find the time string (it's near the top)
    const content = await f.async('string');
    const flag = 'total estimated time: ';
    const flagIdx = content.indexOf(flag);
    if (flagIdx === -1) continue;

    const timeStr = content.slice(flagIdx + flag.length, content.indexOf('\n', flagIdx + flag.length));
    let seconds = 0;

    let t = timeStr.match(/(\d+)[d]/);
    if (t) seconds += parseInt(t[1]) * 86400;

    t = timeStr.match(/(\d+)[h]/);
    if (t) seconds += parseInt(t[1]) * 3600;

    t = timeStr.match(/(\d+)[m]/);
    if (t) seconds += parseInt(t[1]) * 60;

    t = timeStr.match(/(\d+)[s]/);
    if (t) seconds += parseInt(t[1]);

    return seconds;
  }

  return 0;
}

async function loadThumbnail(zip, plateIndex, getMeta) {
  // Try metadata path first (like original swaplist.app)
  const metaPath = getMeta('thumbnail_file');
  const variants = [
    metaPath,
    `Metadata/plate_${plateIndex}.png`,
    `Metadata/Plate_${plateIndex}.png`,
    `Metadata/plate_${plateIndex}_thumbnail.png`,
  ].filter(Boolean);

  for (const path of variants) {
    const f = zip.file(path);
    if (f) {
      const blob = await f.async('blob');
      return URL.createObjectURL(blob);
    }
  }
  return null;
}

async function parsePlateNames(zip) {
  const names = {};
  const modelFile =
    zip.file('Metadata/model_settings.config') ||
    zip.file('metadata/model_settings.config');
  if (!modelFile) return names;

  const xml = await modelFile.async('string');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');

  for (const plateEl of doc.querySelectorAll('plate')) {
    let id = null;
    let name = null;
    for (const m of plateEl.querySelectorAll('metadata')) {
      const key = m.getAttribute('key');
      if (key === 'plater_id') id = parseInt(m.getAttribute('value'));
      if (key === 'plater_name') name = m.getAttribute('value');
    }
    if (id != null && name) names[id] = name;
  }
  return names;
}

export function computeStats(plates, loopRepeats) {
  const loop = Math.max(1, loopRepeats);
  let totalSeconds = 0;
  let totalPlates = 0;
  const slotTotals = {};

  plates.forEach((p) => {
    const reps = Math.max(1, p.repeats) * loop;
    totalSeconds += p.prediction * reps;
    totalPlates += reps;

    p.filaments.forEach((f) => {
      if (!slotTotals[f.id]) slotTotals[f.id] = { usedM: 0, usedG: 0, color: f.color, type: f.type };
      slotTotals[f.id].usedM += f.usedM * reps;
      slotTotals[f.id].usedG += f.usedG * reps;
    });
  });

  return { totalSeconds, totalPlates, slotTotals };
}
