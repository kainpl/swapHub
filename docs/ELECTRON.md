# swapHub — Electron (Desktop)

swapHub можна запускати як десктопний додаток через Electron. Код React-додатку спільний для веб- і десктопної версії.

---

## Архітектура

```
Один React-код (src/)
       │
       ├── Web:      Vite → dist/ → хостинг (Vercel, Nginx, etc.)
       └── Desktop:  Vite → dist/ → Electron BrowserWindow
```

Electron-специфічні файли:

```
electron/
  main.js                # Entry point — створює вікно, вантажить dist/index.html
electron-builder.json    # Конфіг пакування (win/mac/linux)
```

---

## Швидкий старт

### Запуск в Electron (dev)

```bash
# Білдить Vite + відкриває Electron вікно
npm run electron:dev
```

### Запуск з уже зібраного dist/

```bash
# Спершу зібрати
npm run build

# Потім запустити Electron
npm run electron:preview
```

---

## Збірка інсталятора

### Windows

```bash
npm run electron:build:win
```

Генерує в `release/`:
- `.exe` NSIS інсталятор (one-click install)
- `-portable.exe` (без інсталяції, просто запускаєш)

### macOS

```bash
npm run electron:build:mac
```

Генерує `.dmg` в `release/`.

### Linux

```bash
npm run electron:build:linux
```

Генерує `.AppImage` в `release/`.

### Всі платформи (поточна ОС)

```bash
npm run electron:build
```

---

## Іконка

Покладіть іконку додатку як `public/icon.png` (мінімум 256×256, рекомендовано 512×512).

Для Windows також можна використати `.ico`, для macOS — `.icns`. Шляхи задаються в `electron-builder.json`.

---

## Як це працює

1. `vite build` збирає React-код у `dist/`
2. Electron запускає `electron/main.js`
3. `main.js` створює `BrowserWindow` і завантажує `dist/index.html`
4. Для dev-режиму можна вказати `VITE_DEV_SERVER_URL` — тоді Electron вантажить з dev-сервера (hot reload)

### Dev з hot reload (advanced)

```bash
# Термінал 1: запустити Vite dev сервер
npm run dev

# Термінал 2: запустити Electron з вказівкою на dev сервер
VITE_DEV_SERVER_URL=http://localhost:5173 electron .
```

---

## Конфігурація (electron-builder.json)

| Поле | Опис |
|---|---|
| `appId` | Ідентифікатор додатку |
| `productName` | Ім'я в заголовку вікна та інсталяторі |
| `directories.output` | Куди складає білди (`release/`) |
| `files` | Що пакувати (dist + electron) |
| `win.target` | Формати для Windows: `nsis`, `portable` |
| `mac.target` | Формат для macOS: `dmg` |
| `linux.target` | Формат для Linux: `AppImage` |

Повна документація: https://www.electron.build/configuration

---

## FAQ

**Q: Чи відрізняється функціональність web і desktop версій?**
A: Ні. Код ідентичний. Desktop просто обгортає ту саму сторінку у нативне вікно ОС.

**Q: Чи потрібен інтернет для desktop версії?**
A: Ні. Все працює повністю офлайн — і веб-версія, і десктопна.

**Q: Чи можна збілдити під іншу ОС?**
A: electron-builder підтримує крос-компіляцію, але рекомендується білдити на цільовій ОС для надійності. Для CI можна використовувати GitHub Actions з matrix strategy.
