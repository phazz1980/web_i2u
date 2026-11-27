# ino2ubi — версия для GitHub Pages

Эта папка содержит **статическую** веб-версию ino2ubi: парсер и генератор реализованы на JavaScript, сервер не нужен. Её можно разместить на **GitHub Pages**.

## Как опубликовать на GitHub Pages

1. Закоммитьте и запушьте репозиторий (включая папку `docs/`).
2. В репозитории на GitHub: **Settings → Pages**.
3. В разделе **Build and deployment** выберите:
   - **Source**: Deploy from a branch
   - **Branch**: `main` (или ваша основная ветка)
   - **Folder**: `/docs`
4. Сохраните. Через минуту сайт будет доступен по адресу:
   `https://<username>.github.io/<repo>/`



## Файлы

- `index.html` — страница приложения
- `style.css` — стили
- `constants.js` — константы и маппинг типов
- `parser.js` — парсинг Arduino-кода
- `generator.js` — генерация SIXX XML для FLProg
- `app.js` — логика интерфейса и скачивание .ubi (UTF-16)

Всё выполняется в браузере, данные никуда не отправляются.

## Консольная утилита и плагин для Claude Code

Консоль (Node.js, без зависимостей):

```bash
node cli/ino2ubi.js скетч.ino -o блок.ubi --name "Название блока" [--desc "Описание"] [--en]
```

Плагин для Claude Code: пользователь описывает блок, ИИ пишет скетч по правилам из `AI_INSTRUCTIONS.md` и сразу выдаёт `.ubi`.

```
/plugin marketplace add phazz1980/web_i2u
/plugin install ino2ubi@ino2ubi
```

Папка `ino2ubi-plugin/` самодостаточна: после изменений в `constants.js`, `parser.js`, `generator.js`, `cli/ino2ubi.js` или `AI_INSTRUCTIONS.md` выполните `npm run build:plugin`, чтобы обновить копии.
