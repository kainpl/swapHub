import JSZip from 'jszip';
import SparkMD5 from 'spark-md5';

// ── G-code constants (from original swaplist.app) ────────────────────────────

const STARTER_SWAP =
  ';swap ini code\n' +
  'G91 ; \n' +
  'G0 Z50 F1000; \n' +
  'G0 Z-20; \n' +
  'G90; \n ' +
  'G28 XY; \n ' +
  'G0 Y-4 F5000; grab \n ' +
  'G0 Y145;  pull and fix the plate\n' +
  'G0 Y115 F1000; rehook \n ' +
  'G0 Y180 F5000; pull\n ' +
  'G4 P500; wait  \n ' +
  'G0 Y186.5 F200; fix the plate\n ' +
  'G4 P500; wait  \n ' +
  'G0 Y3 F15000; back \n ' +
  'G0 Y-5 F200; snap \n' +
  'G4 P500; wait  \n ' +
  'G0 Y10 F1000; load \n ' +
  'G0 Y20 F15000; ready \n ';

const DO_SWAP =
  ';swap \n' +
  'G0 X-10 F5000; \n ' +
  'G0 Z175; \n ' +
  'G0 Y-5 F2000;  \n  ' +
  'G0 Y186.5 F2000;  \n  ' +
  'G0 Y182 F10000;  \n  ' +
  'G0 Z186 ; \n ' +
  'G0 Y120 F500; \n ' +
  'G0 Y-4 Z175 F5000; \n ' +
  'G0 Y145; \n  ' +
  'G0 Y115 F1000; \n ' +
  'G0 Y25 F500; \n ' +
  'G0 Y85 F1000; \n ' +
  'G0 Y180 F2000; \n ' +
  'G4 P500; wait  \n ' +
  'G0 Y186.5 F200; \n ' +
  'G4 P500; wait  \n ' +
  'G0 Y3 F3000; \n ' +
  'G0 Y-5 F200; \n' +
  'G4 P500; wait  \n ' +
  'G0 Y10 F1000; \n ' +
  'G0 Z100 Y186 F2000; \n ' +
  'G0 Y150; \n ' +
  'G4 P1000; wait  \n\n';

const MODEL_SETTINGS_TEMPLATE =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<config>\n' +
  '  <plate>\n' +
  '    <metadata key="plater_id" value="1"/>\n' +
  '    <metadata key="plater_name" value="SWAP"/>\n' +
  '    <metadata key="locked" value="false"/>\n' +
  '    <metadata key="gcode_file" value="Metadata/plate_1.gcode"/>\n' +
  '    <metadata key="thumbnail_file" value="Metadata/plate_1.png"/>\n' +
  '    <metadata key="top_file" value="Metadata/top_1.png"/>\n' +
  '    <metadata key="pick_file" value="Metadata/pick_1.png"/>\n' +
  '    <metadata key="pattern_bbox_file" value="Metadata/plate_1.json"/>\n' +
  '  </plate>\n' +
  '</config> ';

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate a .swap.3mf file matching the original swaplist.app logic.
 * All plates are concatenated into a single plate_1.gcode with swap G-code
 * injected between them.
 */
export async function generateSwap(originalZip, plates, loopRepeats, outputName, coverPlate, opts = {}) {
  const { disableMechModeCheck = false, disableMechModeCheckAll = false, disableDynamicFlow = false, onProgress, controller } = opts;
  const loop = Math.max(1, loopRepeats);
  const report = (pct, step) => onProgress?.(Math.round(pct), step);
  const check = () => controller?.checkpoint() ?? Promise.resolve();

  report(0, 'reading');

  // ── 1. Build queue (repeats only, loops applied later) ───────────────────
  const baseQueue = [];
  for (const plate of plates) {
    const reps = Math.max(1, plate.repeats);
    for (let r = 0; r < reps; r++) {
      baseQueue.push(plate);
    }
  }

  // ── 2. Read gcode as text (with cache per plate id) ─────────────────────
  const gcodeCache = {};
  const gcodeEntries = [];

  for (let i = 0; i < baseQueue.length; i++) {
    const plate = baseQueue[i];
    if (!gcodeCache[plate.id]) {
      gcodeCache[plate.id] = await readGcodeText(plate.zip || originalZip, plate);
    }
    gcodeEntries.push(gcodeCache[plate.id]);
    report((i + 1) / baseQueue.length * 30, 'reading');
    await check();
  }

  // ── 3. Append DO_SWAP to each entry ──────────────────────────────────────
  report(30, 'processing');
  for (let i = 0; i < gcodeEntries.length; i++) {
    gcodeEntries[i] += DO_SWAP;
  }

  // ── 4. Loop the array ────────────────────────────────────────────────────
  let loopedEntries = [];
  for (let i = 0; i < loop; i++) {
    loopedEntries = loopedEntries.concat(gcodeEntries);
  }

  // ── 5. Prepend STARTER_SWAP to first entry ──────────────────────────────
  loopedEntries[0] = STARTER_SWAP + loopedEntries[0];

  await check();
  report(35, 'processing');

  // ── 6. Remove MMFC blocks ───────────────────────────────────────────────
  if (disableMechModeCheck) {
    const startIdx = disableMechModeCheckAll ? 0 : 1;
    for (let i = startIdx; i < loopedEntries.length; i++) {
      loopedEntries[i] = loopedEntries[i].replace(
        /;===START: MMFC===[\s\S]*?;===END: MMFC===/g, ''
      );
    }
  }

  // ── 7. Disable dynamic flow calibration on all entries except the first ──
  if (disableDynamicFlow) {
    for (let i = 1; i < loopedEntries.length; i++) {
      loopedEntries[i] = loopedEntries[i].replace(
        /;===START: DFC===[\s\S]*?;===END: DFC===/g, ''
      );
      loopedEntries[i] = loopedEntries[i].replace(
        /;M1002 set_flag extrude_cali_flag=1/g,
        ';M1002 set_flag extrude_cali_flag=1\nM1002 set_flag extrude_cali_flag=0'
      );
    }
  }

  // ── 8. Remove FIN blocks from all entries except the last ───────────────
  for (let i = 0; i < loopedEntries.length - 1; i++) {
    loopedEntries[i] = loopedEntries[i].replace(
      /;===START: FIN===[\s\S]*?;===END: FIN===/g, ''
    );
  }

  await check();
  report(45, 'processing');

  // ── 9. AMS optimization — remove redundant swaps ─────────────────────────
  optimizeAmsSwaps(loopedEntries);

  report(50, 'processing');

  // ── 10. Create gcode blob ───────────────────────────────────────────────
  const gcodeBlob = new Blob(loopedEntries, { type: 'text/x-gcode' });

  // ── 11. Compute MD5 hash ────────────────────────────────────────────────
  await check();
  report(55, 'hashing');
  const md5Hash = await chunkedMd5(gcodeBlob, (p) => report(55 + p * 20, 'hashing'), check);

  // ── 12. Build clean output ZIP (only essential files) ───────────────────
  await check();
  report(75, 'packing');
  const newZip = new JSZip();

  // Structural files from original (content types, relationships)
  await copyIfExists(originalZip, newZip, '[Content_Types].xml');
  await copyIfExists(originalZip, newZip, '_rels/.rels');

  // Printer/filament config
  await copyIfExists(originalZip, newZip, 'Metadata/project_settings.config');

  // Our generated plate files
  newZip.file('Metadata/model_settings.config', MODEL_SETTINGS_TEMPLATE);
  newZip.file('Metadata/plate_1.gcode', gcodeBlob);
  newZip.file('Metadata/plate_1.gcode.md5', md5Hash);

  // slice_info: if single source plate — copy original & patch totals, else build from scratch
  if (plates.length === 1) {
    newZip.file('Metadata/slice_info.config', await patchSinglePlateSliceInfo(originalZip, plates[0], loopRepeats));
  } else {
    newZip.file('Metadata/slice_info.config', await buildMultiPlateSliceInfo(plates, loopRepeats, originalZip));
  }

  // Cover thumbnail from selected plate (full + small)
  if (coverPlate) {
    const zip = coverPlate.zip || originalZip;
    const thumbData = await extractThumbnail(zip, coverPlate.index);
    if (thumbData) {
      newZip.file('Metadata/plate_1.png', thumbData);
    }
    const smallData = await extractThumbnailSmall(zip, coverPlate.index);
    if (smallData) {
      newZip.file('Metadata/plate_1_small.png', smallData);
    }
  }

  // ── 13. Generate ZIP blob ────────────────────────────────────────────────
  report(85, 'packing');
  const result = await newZip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 } },
    (meta) => report(85 + meta.percent * 0.15, 'packing'),
  );
  report(100, 'done');
  return result;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function extractThumbnail(zip, plateIndex) {
  const variants = [
    `Metadata/plate_${plateIndex}.png`,
    `Metadata/Plate_${plateIndex}.png`,
    `Metadata/plate_${plateIndex}_thumbnail.png`,
  ];
  for (const path of variants) {
    const f = zip.file(path);
    if (f) return await f.async('uint8array');
  }
  return null;
}

async function extractThumbnailSmall(zip, plateIndex) {
  const variants = [
    `Metadata/plate_${plateIndex}_small.png`,
    `Metadata/Plate_${plateIndex}_small.png`,
  ];
  for (const path of variants) {
    const f = zip.file(path);
    if (f) return await f.async('uint8array');
  }
  return null;
}

async function readGcodeText(zip, plate) {
  const origIdx = plate.index;
  const variants = [
    `Metadata/plate_${origIdx}.gcode.3mf`,
    `Metadata/Plate_${origIdx}.gcode.3mf`,
    `Metadata/plate_${origIdx}.gcode`,
    `Metadata/Plate_${origIdx}.gcode`,
    plate.fileName.includes('/') ? plate.fileName : `Metadata/${plate.fileName}`,
  ];

  for (const variant of variants) {
    const f = zip.file(variant);
    if (f) return await f.async('string');
  }

  throw new Error(`Gcode file not found for plate ${origIdx}`);
}

function optimizeAmsSwaps(entries) {
  const AMS_FLAG = '\nM620 S';
  const markers = [];

  // Scan all entries for M620 S markers
  for (let i = 0; i < entries.length; i++) {
    let idx = entries[i].indexOf(AMS_FLAG);
    while (idx !== -1) {
      const charIdx = idx + 1; // position after \n
      let buf = entries[i].substring(idx + 7, idx + 10);
      if (buf[2] === '\n' || buf[2] === ' ') buf = buf.substring(0, 2);
      markers.push({ entryIdx: i, charIdx, slotValue: buf });
      idx = entries[i].indexOf(AMS_FLAG, idx + 1);
    }
  }

  // Disable redundant AMS swaps
  for (let i = 0; i < markers.length - 1; i++) {
    if (markers[i].slotValue === '255') {
      if (i > 0 && markers[i - 1].slotValue === markers[i + 1].slotValue) {
        entries[markers[i].entryIdx] = disableAmsBlock(
          entries[markers[i].entryIdx],
          markers[i].charIdx
        );
        entries[markers[i + 1].entryIdx] = disableAmsBlock(
          entries[markers[i + 1].entryIdx],
          markers[i + 1].charIdx
        );
      }
    }
  }
}

function disableAmsBlock(str, index) {
  if (index > str.length - 1) return str;
  const blockEnd = str.substring(index).search('M621 S');
  if (blockEnd < 0) return str;
  let replacement = ';SWAP - AMS block removed';
  while (replacement.length < blockEnd - 1) replacement += '/';
  replacement += ';';
  if (replacement.length > 2000) return str;
  return str.substring(0, index) + replacement + str.substring(index + blockEnd);
}

function chunkedMd5(blob, onProgress, check) {
  return new Promise((resolve, reject) => {
    const chunkSize = 2097152; // 2MB
    const chunks = Math.ceil(blob.size / chunkSize);
    let currentChunk = 0;
    const spark = new SparkMD5.ArrayBuffer();
    const reader = new FileReader();

    reader.onload = async (e) => {
      spark.append(e.target.result);
      currentChunk++;
      onProgress?.(currentChunk / chunks);
      if (currentChunk < chunks) {
        try { await check?.(); } catch (err) { reject(err); return; }
        loadNext();
      } else {
        resolve(spark.end());
      }
    };

    reader.onerror = () => reject(new Error('MD5 computation failed'));

    function loadNext() {
      const start = currentChunk * chunkSize;
      const end = Math.min(start + chunkSize, blob.size);
      reader.readAsArrayBuffer(blob.slice(start, end));
    }

    loadNext();
  });
}

async function copyIfExists(srcZip, dstZip, path) {
  const f = srcZip.file(path);
  if (f) dstZip.file(path, await f.async('uint8array'));
}

/**
 * Single source plate: copy original slice_info.config as-is,
 * keep only the matching <plate>, patch prediction/weight/filament totals.
 */
async function patchSinglePlateSliceInfo(originalZip, plate, loopRepeats) {
  const sliceFile = originalZip.file('Metadata/slice_info.config') || originalZip.file('metadata/slice_info.config');
  if (!sliceFile) return buildMultiPlateSliceInfo([plate], loopRepeats, originalZip);

  const raw = await sliceFile.async('string');
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, 'application/xml');
  const totalReps = Math.max(1, plate.repeats) * Math.max(1, loopRepeats);

  // Find the matching <plate> by index
  const allPlates = doc.querySelectorAll('plate');
  let targetPlate = null;
  for (const pel of allPlates) {
    const metaEls = pel.querySelectorAll('metadata');
    for (const m of metaEls) {
      if (m.getAttribute('key') === 'index' && m.getAttribute('value') === String(plate.index)) {
        targetPlate = pel;
        break;
      }
    }
    if (targetPlate) break;
  }

  if (!targetPlate) return buildMultiPlateSliceInfo([plate], loopRepeats, originalZip);

  // Remove all other <plate> elements
  for (const pel of allPlates) {
    if (pel !== targetPlate) pel.remove();
  }

  // Patch index to 1
  const setMeta = (key, value) => {
    const metaEls = targetPlate.querySelectorAll('metadata');
    for (const m of metaEls) {
      if (m.getAttribute('key') === key) {
        m.setAttribute('value', value);
        return;
      }
    }
    // Add if not present
    const el = doc.createElement('metadata');
    el.setAttribute('key', key);
    el.setAttribute('value', value);
    targetPlate.insertBefore(el, targetPlate.firstChild);
  };

  setMeta('index', '1');
  setMeta('file_name', 'plate_1.gcode');

  // Multiply prediction and weight
  const metaEls = targetPlate.querySelectorAll('metadata');
  for (const m of metaEls) {
    const key = m.getAttribute('key');
    if (key === 'prediction' || key === 'weight') {
      const orig = parseFloat(m.getAttribute('value') || '0');
      m.setAttribute('value', String(Math.round(orig * totalReps * 100) / 100));
    }
  }

  // Multiply filament usage
  for (const f of targetPlate.querySelectorAll('filament')) {
    const usedM = parseFloat(f.getAttribute('used_m') || '0');
    const usedG = parseFloat(f.getAttribute('used_g') || '0');
    f.setAttribute('used_m', String(Math.round(usedM * totalReps * 100) / 100));
    f.setAttribute('used_g', String(Math.round(usedG * totalReps * 100) / 100));
  }

  const s = new XMLSerializer();
  return s.serializeToString(doc);
}

/**
 * Multiple source plates: build slice_info from scratch with header from original.
 */
async function buildMultiPlateSliceInfo(plates, loopRepeats, originalZip) {
  const loop = Math.max(1, loopRepeats);

  // Extract <header> block from original slice_info.config
  let headerXml = '';
  const sliceFile = originalZip.file('Metadata/slice_info.config') || originalZip.file('metadata/slice_info.config');
  if (sliceFile) {
    const raw = await sliceFile.async('string');
    const headerMatch = raw.match(/<header[\s\S]*?<\/header>/);
    if (headerMatch) headerXml = '  ' + headerMatch[0] + '\n';
  }

  // Aggregate filaments and totals
  const slotTotals = {};
  let totalPrediction = 0;
  let totalWeight = 0;

  for (const plate of plates) {
    const reps = Math.max(1, plate.repeats) * loop;
    totalPrediction += (plate.prediction || 0) * reps;
    for (const f of plate.filaments) {
      if (!slotTotals[f.id]) {
        slotTotals[f.id] = { trayInfoIdx: f.trayInfoIdx || '', type: f.type, color: f.color, usedM: 0, usedG: 0 };
      }
      slotTotals[f.id].usedM += f.usedM * reps;
      slotTotals[f.id].usedG += f.usedG * reps;
    }
  }

  for (const slot of Object.values(slotTotals)) {
    totalWeight += slot.usedG;
  }

  // Use metadata from first plate as template
  const ref = plates[0] || {};

  const filamentsXml = Object.entries(slotTotals)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(
      ([id, d]) =>
        `    <filament id="${id}"` +
        (d.trayInfoIdx ? ` tray_info_idx="${d.trayInfoIdx}"` : '') +
        ` type="${d.type}" color="${d.color}"` +
        ` used_m="${(Math.round(d.usedM * 100) / 100)}"` +
        ` used_g="${(Math.round(d.usedG * 100) / 100)}"/>`
    )
    .join('\n');

  return (
    '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<config>\n' +
    headerXml +
    '  <plate>\n' +
    '    <metadata key="index" value="1"/>\n' +
    (ref.printerModelId ? `    <metadata key="printer_model_id" value="${ref.printerModelId}"/>\n` : '') +
    (ref.nozzleDiameters ? `    <metadata key="nozzle_diameters" value="${ref.nozzleDiameters}"/>\n` : '') +
    '    <metadata key="file_name" value="plate_1.gcode"/>\n' +
    `    <metadata key="prediction" value="${Math.round(totalPrediction)}"/>\n` +
    `    <metadata key="weight" value="${(Math.round(totalWeight * 100) / 100)}"/>\n` +
    (filamentsXml ? filamentsXml + '\n' : '') +
    '  </plate>\n' +
    '</config>\n'
  );
}
