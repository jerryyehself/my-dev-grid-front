---
name: run-app
description: How to actually launch and drive my-dev-grid-front (Vite/Vue) end-to-end, including its real backend, in a fresh Claude Code on the web container — not the test suite. Use this before claiming a UI/visual change works, whenever the `run` skill's generic fallback would otherwise force rediscovering the same environment facts (no chromium-cli here, backend location, theme switch, seeding realistic content). Captured 2026-09-23 after redoing this discovery mid-task once already.
---

# Running my-dev-grid-front for real

This project's own `run` skill fallback (browser-driven pattern) assumes
`chromium-cli` exists. **It does not exist in this environment.** Everything
below is what actually worked, so the next session doesn't re-derive it.

## 1. Frontend dev server

```bash
cd /home/user/my-dev-grid-front
lsof -ti:5173 -sTCP:LISTEN | xargs -r kill 2>/dev/null   # free the port first
npm run dev -- --port 5173 > /tmp/vite-dev.log 2>&1 &
disown
timeout 30 bash -c 'until curl -sf http://localhost:5173 >/dev/null; do sleep 1; done'
```

Stop the same way: `lsof -ti:5173 -sTCP:LISTEN | xargs -r kill`.

## 2. Backend — it's already here, use the real API, don't mock

`/home/user/my-dev-grid` (the Laravel API, `jerryyehself/my-dev-grid`) is
**already cloned as a sibling repo in this environment**, with `vendor/`
installed, `.env` configured for `DB_CONNECTION=sqlite`, and
`database/database.sqlite` already migrated. `VITE_API_BASE_URL` defaults to
`http://localhost:8000/api`, which is exactly what this serves — no env
changes needed on the frontend side.

```bash
cd /home/user/my-dev-grid
lsof -ti:8000 -sTCP:LISTEN | xargs -r kill 2>/dev/null
php artisan serve --port=8000 > /tmp/laravel-dev.log 2>&1 &
disown
timeout 20 bash -c 'until curl -sf http://localhost:8000/api/documentations >/dev/null; do sleep 1; done'
```

**Don't stand up a second backend or a mock API** — this one is real,
already seeded, and reachable in one command. If a fresh container ever
lacks this clone, `add_repo`/clone `jerryyehself/my-dev-grid`, `composer
install`, `cp .env.example .env`, `php artisan key:generate`, `php artisan
migrate` — but check for the existing clone first, this has been true every
time so far.

**The seed data is thin (as of 2026-09-23: exactly one `documentations` row,
short placeholder body) — not enough to see real line-wrapping/typography.**
To check anything about long-form body text (line length, line-height,
paragraph spacing), seed a longer body first:

```bash
cd /home/user/my-dev-grid
php artisan tinker --execute="
\$a = App\Models\Documentation::first();
\$a->title = '<test title>';
\$a->body = '<realistic-length markdown, several paragraphs>';
\$a->status = 1; // must be 1 to show up in /articles and prev/next; fetchArticle(id) itself doesn't care
\$a->save();
"
```

**Restore it afterward** — this sqlite file is a shared, low-row-count dev
DB, not a disposable fixture; leaving test copy in it is a paper cut for
whoever looks at it next (`git status` in `my-dev-grid` won't show
this — the sqlite file is gitignored, so nothing here ever needs
committing, but restore the row's content anyway):

```bash
php artisan tinker --execute="
\$a = App\Models\Documentation::first();
\$a->title = '測試文章標題'; \$a->status = 0; \$a->save();
"
```

## 3. Driving a browser — use Playwright, not chromium-cli

`chromium-cli` is not installed here. `playwright@1.56.1` **is**, but only
global (`npm ls -g`), and Node's ESM resolver won't see a global package
from an arbitrary script path — symlink it into a local `node_modules`
first:

```bash
mkdir -p /tmp/scratch/node_modules
ln -sfn "$(npm root -g)/playwright" /tmp/scratch/node_modules/playwright
```

Then a plain script works, using the pre-installed Chromium (see the
top-level environment notes — `PLAYWRIGHT_BROWSERS_PATH` points here, don't
`playwright install`):

```js
import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://localhost:5173/articles/1', { waitUntil: 'networkidle' });
await page.screenshot({ path: '/tmp/scratch/shot.png', fullPage: true });
```

Run with `node /tmp/scratch/verify.mjs` (no NODE_PATH needed once the
symlink above exists).

## 4. Switching theme without clicking through the UI

`useTheme.ts` toggles a class on `<html>`, nothing more — set it directly:

```js
await page.evaluate((theme) => {
  document.documentElement.classList.toggle('theme-terminal', theme === 'terminal');
}, 'terminal'); // 'library' (default) needs no class
```

## 5. Representative pages for a visual/CSS change

- `/about` — mostly static content (origin-story prose, intro line), no
  backend dependency for those sections; the only fetch on that page is a
  "recent articles" list further down. Good first check for anything that
  doesn't need seeded content.
- `/articles/:id` — needs the backend + a seeded body (step 2) to show real
  wrapped paragraphs; `fetchArticle(id)` doesn't filter by `status`, so a
  draft (`status: 0`) still loads directly by id even though it won't
  appear in `/articles`' list or prev/next.
- Always check both `.theme-library` (default) and `.theme-terminal`, and
  at least one narrow viewport (~390px) — this project's own
  `visual-design-language` skill requires whole-site/both-theme checks
  before calling a visual decision done.

## 6. Console errors

`ERR_CERT_AUTHORITY_INVALID` noise on unrelated external resources is
expected in this sandboxed environment (the egress proxy's cert isn't
trusted by a bare Playwright launch) — not a regression signal by itself.
Filter it out rather than treating it as a failure; a real break in this
app surfaces as a Vue/JS error, not a cert warning.
