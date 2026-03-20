export default {
  // Header
  'header.subtitle': 'для 3D друку',
  'header.reset': 'Скинути',

  // DropZone
  'drop.title': 'ПЕРЕТЯГНИ ФАЙЛ(И) СЮДИ',
  'drop.subtitle': '…або натисни щоб обрати',
  'drop.express': 'ПЕРЕТЯГНИ ДЛЯ',
  'drop.expressLabel': 'ЕКСПРЕС-КОНВЕРТАЦІЇ',
  'drop.expressCompact': 'ЕКСПРЕС',
  'drop.addMore': 'ДОДАТИ ФАЙЛИ',

  // Stats
  'stats.title': 'Статистика черги',
  'stats.duration': 'Тривалість',
  'stats.plates': 'Столи',
  'stats.filament': 'Витрата філаменту',
  'stats.slot': 'Слот',

  // PrintQueue
  'queue.title': 'Порядок друку',
  'queue.more': '+{n} ще',
  'queue.total': '{n} друків загалом',
  'queue.plateTitle': 'Стіл {label} — цикл {loop}',

  // Loop repeats
  'loop.title': 'Повтори циклу',
  'loop.desc': 'Скільки разів повторюється вся черга цілком.',

  // Custom file name
  'filename.title': "Ім'я файлу",

  // Options
  'options.title': 'Опції',
  'options.mmfc': 'Вимкнути Mech Mode fast check',
  'options.mmfcDesc': 'Прибирає перевірку мех-моду між столами, залишаючи тільки стартову.',
  'options.mmfcAll': 'Повністю (включаючи першу)',
  'options.dynflow': 'Вимкнути Dynamic Flow Calibration',
  'options.dynflowDesc': 'Прибирає повторну калібрацію потоку між столами, залишаючи тільки початкову.',

  // PlateGallery
  'gallery.title': 'Превʼю столів',
  'gallery.plate': 'Стіл {n}',

  // PlateCard
  'card.plate': 'Стіл {n}',
  'card.noFilament': 'Немає даних про філамент',
  'card.slot': 'Слот {n}',
  'card.repeats': 'Повтори',
  'card.loopTotal': '× {loop} цикл = {total}×',
  'card.dragTitle': 'Перетягни для зміни порядку',

  // Generate
  'generate.btn': 'Згенерувати SWAP файл',
  'generate.loading': 'Генерація…',

  // Info blocks
  'info.security.title': 'Безпека даних',
  'info.security.text': 'Цей додаток працює повністю у вашому браузері. Жоден файл не відправляється на сервер. Можна використовувати офлайн.',
  'info.howto.title': 'Як це працює',
  'info.howto.text1': 'Перетягни <strong>нарізаний</strong> у Bambu Studio або Orca Slicer <code>.3mf</code> файл. Встанови кількість повторів для кожного столу та циклів, потім завантаж <code>.swap.3mf</code> з правильним порядком друку.',
  'info.howto.text2': 'Приклад: стіл <strong>A</strong> × 3, стіл <strong>B</strong> × 1, цикл × 2 → <code>A A A B A A A B</code>',

  // Status
  'status.parsing': 'Парсинг 3MF файлів…',
  'status.genFail': 'Помилка генерації',

  // Log
  'log.title': 'Журнал',
  'log.generating': 'Генерація swap файлу ({n} тип(ів) столів × {loop} цикл)…',
  'log.downloaded': 'Завантажено: {name}',
  'log.genError': 'Помилка генерації: {msg}',
  'log.loading': 'Завантаження: {name}',
  'log.added': 'Додано {plates} стіл(ів) з {files} файл(ів)',
  'log.error': 'Помилка: {msg}',
  'log.reset': 'Скинуто',

  // Errors (parse3mf)
  'error.invalidFile': 'Неможливо прочитати файл — переконайтесь, що це валідний .3mf файл.',
  'error.notSliced': 'Це не нарізаний Bambu 3MF файл.\nСпершу наріжте модель у Bambu Studio або Orca Slicer, потім експортуйте 3MF.',
  'error.corruptConfig': 'Пошкоджений slice_info.config у 3MF файлі.',
  'error.noPlates': 'У цьому 3MF файлі не знайдено нарізаних столів.',
  'error.wrongPrinter': 'Цей файл нарізано для принтера "{model}".\nSwapMod сумісний тільки з Bambu Lab A1 Mini (N1). Інші принтери не підтримуються.',

  // Progress
  'progress.reading': 'Читання G-code…',
  'progress.processing': 'Обробка…',
  'progress.hashing': 'Обчислення хешу…',
  'progress.packing': 'Пакування ZIP…',
  'progress.done': 'Готово',
  'progress.cancelled': 'Генерацію скасовано',
  'progress.pause': 'Пауза',
  'progress.resume': 'Продовжити',
  'progress.stop': 'Стоп',

  // Footer
  'footer.guide': 'Інструкція',

  // Language
  'lang.en': 'EN',
  'lang.uk': 'UA',
};
