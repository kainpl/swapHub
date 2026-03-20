export default {
  // Header
  'header.subtitle': 'for 3D printing',
  'header.reset': 'Reset',

  // DropZone
  'drop.title': 'DROP YOUR FILE(S) HERE',
  'drop.subtitle': '…or click to select',
  'drop.express': 'DROP HERE FOR',
  'drop.expressLabel': 'EXPRESS CONVERSION',
  'drop.expressCompact': 'EXPRESS',
  'drop.addMore': 'ADD MORE FILES',

  // Stats
  'stats.title': 'Queue statistics',
  'stats.duration': 'Duration',
  'stats.plates': 'Plates',
  'stats.filament': 'Filament usage',
  'stats.slot': 'Slot',

  // PrintQueue
  'queue.title': 'Print order',
  'queue.more': '+{n} more',
  'queue.total': '{n} total prints',
  'queue.plateTitle': 'Plate {label} — loop {loop}',

  // Loop repeats
  'loop.title': 'Loop repeats',
  'loop.desc': 'How many times the entire queue is reprinted.',

  // Custom file name
  'filename.title': 'Custom file name',

  // Options
  'options.title': 'Options',
  'options.mmfc': 'Disable Mech Mode fast check',
  'options.mmfcDesc': 'Removes mech mode fast check between plates, keeping only the initial one at start.',
  'options.mmfcAll': 'Completely (including the first)',
  'options.dynflow': 'Disable Dynamic Flow Calibration',
  'options.dynflowDesc': 'Removes repeated dynamic flow calibration between plates, keeping only the initial one.',

  // PlateGallery
  'gallery.title': 'Plate preview',
  'gallery.plate': 'Plate {n}',

  // PlateCard
  'card.plate': 'Plate {n}',
  'card.noFilament': 'No filament data',
  'card.slot': 'Slot {n}',
  'card.repeats': 'Repeats',
  'card.loopTotal': '× {loop} loop = {total}×',
  'card.dragTitle': 'Drag to reorder',

  // Generate
  'generate.btn': 'Generate SWAP file',
  'generate.loading': 'Generating…',

  // Info blocks
  'info.security.title': 'Data security',
  'info.security.text': 'This app runs entirely in your browser. None of your files are sent to any server. You can use it completely offline.',
  'info.howto.title': 'How it works',
  'info.howto.text1': 'Drop a <strong>sliced</strong> Bambu Studio or Orca Slicer <code>.3mf</code> file. Set repeats per plate and loop count, then download a <code>.swap.3mf</code> with plates in the correct print order.',
  'info.howto.text2': 'Example: plate <strong>A</strong> × 3, plate <strong>B</strong> × 1, loop × 2 → <code>A A A B A A A B</code>',

  // Status
  'status.parsing': 'Parsing 3MF files…',
  'status.genFail': 'Generation failed',

  // Log
  'log.title': 'Log',
  'log.generating': 'Generating swap file ({n} plate type(s) × {loop} loop)…',
  'log.downloaded': 'Downloaded: {name}',
  'log.genError': 'Generation error: {msg}',
  'log.loading': 'Loading: {name}',
  'log.added': 'Added {plates} plate(s) from {files} file(s)',
  'log.error': 'Error: {msg}',
  'log.reset': 'Reset',

  // Errors (parse3mf)
  'error.invalidFile': 'Cannot read file — make sure it is a valid .3mf file.',
  'error.notSliced': 'Not a sliced Bambu 3MF file.\nPlease slice the model in Bambu Studio or Orca Slicer first, then export the 3MF.',
  'error.corruptConfig': 'Corrupt slice_info.config in 3MF file.',
  'error.noPlates': 'No sliced plates found in this 3MF file.',
  'error.wrongPrinter': 'This file is sliced for "{model}" printer.\nSwapMod is only compatible with Bambu Lab A1 Mini (N1). Other printers are not supported.',

  // Progress
  'progress.reading': 'Reading G-code…',
  'progress.processing': 'Processing…',
  'progress.hashing': 'Computing hash…',
  'progress.packing': 'Packing ZIP…',
  'progress.done': 'Done',
  'progress.cancelled': 'Generation cancelled',
  'progress.pause': 'Pause',
  'progress.resume': 'Resume',
  'progress.stop': 'Stop',

  // Footer
  'footer.guide': 'Setup Guide',

  // Language
  'lang.en': 'EN',
  'lang.uk': 'UA',
};
