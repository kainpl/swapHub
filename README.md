# swapHub — 3D Print Swap Queue Generator

Утиліта для swap-моду на **Bambu Lab A1 Mini**. Дозволяє налаштувати порядок і повтори пластин у черзі друку та згенерувати `.swap.3mf` файл — повністю локально, без сервера.

Доступна як **веб-додаток** (браузер) і як **десктопний додаток** (Electron).

> Swap-мод сумісний **тільки з A1 Mini** (printer_model_id: N1).

---

## Як використовувати

### 1. Підготуй файл

Відкрий свою модель у **Bambu Studio** або **Orca Slicer**, наріж (`Slice`) і збережи як `.3mf`. Файл повинен містити готовий gcode — нарізаний, не просто геометрію.

### 2. Завантаж у swapHub

- **Звичайний режим** — перетягни файл або натисни зону DROP. Відкриється UI для налаштування.
- **Express** — перетягни на зону EXPRESS CONVERSION. Файл одразу конвертується з налаштуваннями за замовчуванням.

### 3. Налаштуй чергу

- Кожна **пластина** (plate) отримує власну кількість **повторів**
- **Чекбокс** на картці — вмикає/вимикає пластину в генерації
- **Loop repeats** — скільки разів повторюється вся черга цілком

```
Приклад: Plate A × 3, Plate B × 1, Loop × 2

Результат друку: A A A B  A A A B
```

### 4. Опції

- **Disable Mech Mode fast check** — прибирає перевірку мех-моду між плейтами, залишаючи тільки стартову
  - **Повністю (включаючи першу)** — прибирає перевірку з усіх плейтів, включаючи перший
- **Disable Dynamic Flow Calibration** — відключає повторну калібрацію потоку між плейтами

> Для роботи цих опцій G-code у слайсері повинен містити спеціальні маркери (`MMFC`, `DFC`, `FIN`). Деталі — у вбудованому Setup Guide.

### 5. Генеруй і друкуй

Вибери обкладинку з галереї → вкажи ім'я файлу → **Generate SWAP file** → отримуєш `.swap.3mf`.
Відкрий його у Bambu Studio / Orca Slicer і відправ на принтер.

---

## Запуск — Web

```bash
npm install

# Dev-сервер
npm run dev
# → http://localhost:5173

# Production білд
npm run build
npm run preview
```

## Запуск — Desktop (Electron)

```bash
# Запуск (білд + відкриття вікна)
npm run electron:dev

# Збірка інсталятора під поточну ОС
npm run electron:build

# Або під конкретну платформу
npm run electron:build:win      # Windows (.exe installer + portable)
npm run electron:build:mac      # macOS (.dmg)
npm run electron:build:linux    # Linux (.AppImage)
```

Готові файли з'являться у `release/`.

Детальна документація: [docs/ELECTRON.md](docs/ELECTRON.md)

**Вимоги:** Node.js 18+

---

## Структура проекту

```
src/                             # React-код (спільний для web і desktop)
├── App.jsx                      # Головний компонент, весь стейт
├── index.css                    # Tailwind, CSS-змінні, шрифти
├── main.jsx                     # Entry point React
├── components/
│   ├── DropZone.jsx             # Drag-and-drop зона (звичайна + express)
│   ├── GuideModal.jsx           # Модальне вікно з Setup Guide (markdown)
│   ├── LangSwitcher.jsx         # Перемикач мови (UK/EN)
│   ├── PlateCard.jsx            # Картка пластини (draggable, toggle, repeats)
│   ├── PlateGallery.jsx         # Галерея thumbnail для вибору обкладинки
│   ├── PrintQueue.jsx           # Візуалізація черги друку
│   ├── Stats.jsx                # Статистика часу та філаменту
│   └── ThemeSwitcher.jsx        # Перемикач теми (dark/light)
├── docs/
│   ├── setup-guide.uk.md        # Setup Guide (українська)
│   └── setup-guide.en.md        # Setup Guide (англійська)
├── i18n/
│   ├── index.jsx                # i18n провайдер і хук useI18n
│   ├── uk.js                    # Переклади — українська
│   └── en.js                    # Переклади — англійська
├── theme/
│   └── index.jsx                # Провайдер теми (dark/light)
├── utils/
│   ├── parse3mf.js              # Парсинг 3MF (slice_info + model_settings)
│   ├── generate.js              # Генерація .swap.3mf з gcode-склейкою
│   └── generateController.js    # Контролер генерації (pause/resume/stop)
electron/
│   └── main.js                  # Electron entry point
electron-builder.json            # Конфіг пакування desktop-версії
docs/
│   └── ELECTRON.md              # Документація по Electron
```

---

## Технології

- **React 19** + **Vite 7**
- **Tailwind CSS** — utility-first стилі
- **JSZip** — читання і створення `.3mf` (ZIP-архівів)
- **SparkMD5** — MD5 хеш для gcode
- **@dnd-kit** — drag & drop для сортування пластин
- **sonner** — toast-нотифікації
- **marked** — рендеринг Markdown (вбудований Setup Guide)
- **Electron 41** — десктопна обгортка (опціонально)
- **electron-builder** — пакування інсталяторів (win/mac/linux)

---

## Безпека даних

Додаток повністю працює у браузері клієнта. Жоден файл не відправляється на сервер чи в хмару. Можна зберегти як статичну сторінку і використовувати офлайн.

---

## Обмеження

| Обмеження | Деталі |
|---|---|
| Тільки A1 Mini | Swap-мод працює строго з Bambu Lab A1 Mini (N1) |
| Тільки нарізані файли | Файл повинен містити gcode (slice_prediction, filament дані) |
| Bambu / Orca format | Формат slice_info.config специфічний для цих слайсерів |
| До 4 слотів AMS | Відображаються слоти 1–4 відповідно до AMS конфігурації |

---

## Ліцензія

MIT
