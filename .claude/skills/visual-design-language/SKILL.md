---
name: visual-design-language
description: This project's (my-dev-grid-front) visual design language and the method for extending it — how a style decision turns into design tokens, then a component rule, then an architecture pattern, then something that holds across the whole site. Use this whenever making or evaluating a visual/UI decision here — new component styling, a new theme or color palette, typography, icons, animation, or reviewing whether an existing element's look is justified. Also covers the fallback method for generating color palettes when external color tools are unreachable, and the evaluation lenses (site positioning D-178 first, then Norman's design principles, NN/g heuristics, common AI-generated-design clichés) to run every visual decision through.
---

# Visual Design Language

This project isn't a portfolio site — it's an externalized "brain" for knowledge
management and idea incubation. That framing is why visual decisions here get
checked against more than taste: a choice that looks fine but doesn't mean
anything (see the nav dot example below) is a bug, not a style preference.

**Current themes** (since 2026-09-29, D-59): both
`.theme-light` (light, default) and `.theme-dark` (dark, toggled via
`useTheme.ts` / `ThemeToggle.vue`) are filled with the **navy v2** palette —
card-stock ground, navy (`--bg-nav-footer`/`--bg-band-strong`), wine accent in
light / brass accent in dark, brass as a third color. Values were generated and
contrast-verified by the scripts in `design/palettes/tools/`, not hand-picked;
the other candidates (green buckram, navy v1) and every token's audit live in
`design/palettes/`. The previous palettes (light "米白＋磚紅" `#fcfaf2`/`#b45309`,
which matched the AI-cliché checklist below and failed AA at 4.40:1; dark
Gruvbox) are retired. Error messages use their own `--text-error` (same generator, ≥5:1 on every ground it sits on, and kept visibly apart from `--text-accent` — OKLab ΔE ≥ 0.1 — because form labels are accent-coloured right above the error line); `BaseHint`/`BaseLoadingBlock` take `tone="error"` rather than callers overriding the text colour. Type (D-60): headings `--font-serif` = Noto Serif TC,
the "IN / ARCHIVE" wordmark `--font-wordmark` = Libre Caslon Text 700;
Fraunces is no longer loaded. `references/alternate-palettes.md` holds older
dark-slot candidates from the Gruvbox era — swapping a theme still means
replacing the values inside the theme block, not renaming classes or touching
the toggle logic.

**Page background** (2026-11-16): one flat colour per theme, `--bg-page`
(an alias, no new value): `--bg-paper-light` in the light theme,
`--bg-paper-dark` in the dark one. The page-long gradient, the dark theme's
scanlines and its vignette are gone: the same screen position had different
colours on short and long pages, and brightness that carries no data is
noise. A page may keep a texture (paper lines) inside its own band, never on
`body`. Dark ground choice: against `--bg-paper-dark` the panel colour
`--bg-folder` is 1.3:1 and muted text 6.9:1; against `--bg-paper-light` they
would be 1.13:1 and 6.0:1.

## The chain: tokens → component rule → architecture → whole site

Every visual decision should be traceable through four layers. Skipping a
layer is usually how inconsistency creeps in.

1. **Tokens.** Colors live in `src/assets/css/variables.css` as semantic CSS
   variables — `--bg-*`, `--text-*`, `--border-*` — not literal hex values in
   components. Two themes are already defined there (`:root`/`.theme-light`
   default, `.theme-cyber` alternate); components consume them via Tailwind's
   `bg-(--bg-nav-footer)` / `text-(--text-ink-main)` syntax.

2. **Component rule.** A token only matters once it implies a rule other
   components should follow. Example already in this codebase: the blog-list
   redesign replaced per-card borders/shadows with a single bordered panel
   divided by hairlines (`divide-y`), hover as a faint background shift
   instead of elevation. The rule behind it — *geometry/line-driven, not
   mass/shadow-driven* — should apply to any future list view (project cards,
   the homepage idea list), not just that one component.

3. **Architecture.** Chrome (nav/header/footer) styling lives in exactly one
   layer: `App.vue` reads `route.meta` and feeds `MainLayout.vue`, which owns
   all shared chrome; `views/*` stay undressed content. This is why a chrome-level
   style decision (e.g. the sticky header's background) should only ever need
   editing in `MainLayout.vue` — if a view starts overriding chrome styling
   directly, that's the architecture layer breaking down.

   **Concrete example — `MainLayout.vue`'s `hideHeader`**: `AboutView.vue` and
   `ArticleDetailView.vue` each draw their own full replacement for the
   generic chrome header (a hero banner; a real tag/date/title/intro block).
   Left as-is, the generic header rendered too — both a real value and a
   meaningless placeholder stacked on top of each other (`ArticleDetailView`'s
   case was worse: the placeholder was the literal string "Article Detail",
   contradicting the real title right below it). The fix is a `hideHeader`
   route-meta flag `MainLayout.vue` checks before rendering its own header —
   *not* letting each view reach into chrome to hide it itself. A page that
   owns its own full header replacement should say so declaratively through
   the same `route.meta` channel every other chrome decision already goes
   through, not add a one-off override.

4. **Whole site.** A decision isn't done until it's checked in *both* themes.
   A hardcoded color that happens to look fine against one theme's paper color
   is exactly how bugs like the one below happen.

**Concrete bug this caught**: `MainLayout.vue`'s page title, sticky-header
background, and footer were hardcoded to `text-stone-950` / `bg-[#f4f0e1]` /
`border-stone-200` instead of tokens. Both shipped themes (light, cyber)
happen to have light paper backgrounds, so it never showed — until a dark-paper
theme candidate made the title unreadable (near-black text on near-black
background). Fixed by routing all of it through `--text-ink-main` /
`--bg-paper-dark` / `--border-shelf`. When evaluating a new theme candidate,
re-check `MainLayout.vue` and `TheNavbar.vue` render correctly — a theme that
only works on paper-colored content is validating an incomplete design.

**Resolved**: `SiteHeader.vue` and `SiteFooter.vue` were dead components —
neither was imported anywhere; `MainLayout.vue` had its own inline
header/footer instead. `SiteHeader.vue` wasn't simple dead code either: it was
a more developed, abandoned design (three header variants switched by
`route.meta.type` — profile/essay/snippet) that never got wired up, and it had
its own hardcoded `bg-white`. Deleted both rather than reviving them — a
half-finished alternate architecture sitting unused is worse than no
architecture, and reviving it would have meant reconciling two different
header systems, not just a rename.

## Component naming

The naming rules themselves (prefixes, file names, events, props) live in
[`docs/conventions/naming.md`](../../../docs/conventions/naming.md) — don't
restate them here. What matters visually: **`Base*`** components are where a
style decision from the chain above turns into something concrete and shared,
instead of getting re-implemented per view (see the button variants below).

`SiteHeader.vue` / `SiteFooter.vue` used a `Site*` prefix that isn't part of
Vue's convention — one more reason (beyond being dead code, above) they didn't
just get renamed and kept.

**Concrete example — `BaseButton.vue`**: built with three variants
(`primary`, `tab`, `page`) instead of inventing a fourth kind whenever a new
button-like element showed up. Refactoring `ArticlesView.vue` to use it
surfaced real bugs that had been sitting in that file: a `:style` binding
missing its `:` (so the active filter tab's background was silently a dead
static string, never actually reactive), `rgba(var(--text-ink-main), 0.1)`
(invalid CSS — `rgba()` needs numeric R/G/B, not a hex-string token), and
`text-amber-800 dark:text-amber-600` (hardcoded color, and `dark:` is
Tailwind's own OS-preference dark mode, which has nothing to do with this
project's theme toggle — it would never fire from clicking 明亮模式/暗黑模式). All
three are the kind of bug that consolidating into a shared component makes
visible and cheap to fix once, instead of silently repeated at every call site.

**Concrete example — `BaseCard.vue` / `BaseTag.vue`**: `ProjectsView.vue`'s
project cards had the same class of bug — `bg-emerald-50 text-emerald-700` /
`bg-amber-50 text-amber-700` for the active/archived status badge, plus
`text-amber-950` throughout the card, all hardcoded and all unreadable once a
dark-paper theme exists. Resolved *without* adding a new "semantic status
color" token category: `BaseTag`'s `accent` / `muted` tones just reuse
`--text-accent` and `--text-ink-muted` at different emphasis, so "active" vs
"archived" reads through weight/contrast rather than a new hue. Reach for a
real new semantic color (success/warning/error) only if a genuine tri-state or
alert-level distinction shows up — two states that are really just
"current" vs "past" don't need one.

**Concrete example — `BaseSegmented.vue` (D-66, 2026-09-30)**: every
one-of-N toggle on the site uses it — Articles 時間軸/分類夾, the home graph's
節點顏色, `/graph` 2D/3D, About 從兩頭看, the article editor's 編輯/預覽 and
草稿/已發布 (`stretch`), and the manage page's filter. Before it there were four
looks for the same control (pill with a pale fill and wine text, pill with a
solid wine fill, navy solid, square navy solid). Selected = `--bg-selected` /
`--text-on-selected`: navy in the light theme, **brass in the dark theme**,
because the dark theme's page ground *is* navy and a navy fill disappears into
it. Unselected = transparent with a 35% ink border. Sizes: `sm` (toolbars) and
`md` (44px, primary in-content toggle). Deliberately *not* using it: the
navbar's active link (brass text + underline on the navy bar — a different
context) and multi-select filter chips like the graph's 顯示層 (category
colours carry meaning). A new one-of-N toggle reaches for `BaseSegmented`, not
a fresh set of ternary classes. Comparison: canvas `8nZmo6sneYNdSEgfGHXst8`.

`BaseSwitch` (added 2026-09-30) is the on/off counterpart: a single thing
shown or hidden, `role="switch"`. Its "on" track uses the same
`--bg-selected`/`--text-on-selected` pair, so the site has only one look for
"this is on/selected". First use: the home graph's 間接關聯 switch. It is off
by default because the user wanted a less cluttered first view.

**Where a shared component's values come from** (added 2026-09-16, after getting
this wrong): when the role already exists in a design canvas's `<style>` block
(`.lbl`, `.hint`, `.fld`, `.chip` in the article-editor canvas), that block is
the authoritative definition — build the component from it, don't reverse-engineer
from the existing code. Extracting from code preserves whatever drift the code
already had and hands it a component's authority. Concretely: `BaseEyebrow` was
first built by reading `AboutView.vue` (0.2em) and the editor sidebar (0.24em),
concluding there were two variants, and documenting a rationale ("0.2em for page
sections, 0.24em for form fields") that no design ever stated — the canvas says
0.24em throughout, with one single inline override to 0.2em. `BaseHint` pushed
`letter-spacing` out to its call sites, so most of 26 call sites lost it. Count
the canvas's overrides before inventing a variant: overridden once = an
exception, mirror it as a call-site override; not a prop. See the `mockup-fidelity`
skill, "When the mockup defines its own shared classes".

**What didn't get built yet, on purpose**: a shared list-panel component for
the blog-list layout. It exists once, in `ArticlesView.vue` — `HomeView.vue`
is currently empty, so there's no second real usage to extract a shared shape
from yet. Building it now would mean guessing what the homepage's idea list
needs before that view exists. Wait for the second real usage.

**Concrete example — `TheNavbar.vue`**: several bugs surfaced only once
real users/devices/data hit the nav, not from looking at it on a desktop
screenshot:
- The nav background stays full-bleed to the viewport edge, but its inner row
  (logo, links, toggle) aligns to the widest content container: `1120px` with
  the same side padding as the page header and content (16px, 24px from
  `sm`; 12px below 360px so the wordmark fits). Bars stacked under the nav
  (the scroll-tracking bar, the mobile menu panel) follow that same inner
  row, so the wordmark, breadcrumb and menu links share one left edge. The
  old version capped the content to `max-w-5xl`, which was a bug: it tied the
  nav to the narrower per-page column. 1120 is the widest container any page
  uses, so the nav never sits inside the content column.
- The active-link indicator was a 4px dot to the left of the label, with the
  label also switching to bold. Neither matched the intended design: an
  underline-style ribbon below the label, color-only (no weight change) —
  active state should be exactly one signal, not two competing ones (color
  *and* boldness) that can drift out of sync.
- `--text-nav-hover` (the active/hover color) was `#fcd34d` in the light
  theme — a different value from `--text-accent` (`#b45309`), even though
  the dark theme already keeps the two identical. A token can be internally
  self-consistent (still a valid-looking hex, still used correctly by name)
  and still be *wrong* relative to a sibling token it should track — check a
  token's resolved value against the tokens it's conceptually tied to, not
  just that components reference it.
- No mobile breakpoint at all: four nav items plus the theme toggle simply
  overflowed the viewport below `md:`, forcing horizontal scroll to reach
  "NOTES" or the theme toggle. Fixed with a hamburger menu below `md:`,
  the horizontal layout preserved at and above it. Chrome needs its own
  responsive check independent of whatever breakpoint testing a page's
  content got — nav renders on every page, so a gap here is a sitewide gap.

**Concrete example — responsive fallback for canvas-style visualizations**:
`AboutView.vue`'s knowledge-graph section absolutely-positions node cards by
percentage of container width. That math holds at desktop widths but breaks
under ~640px — a 230px-wide card centered near a container edge extends
past the viewport and gets clipped, unreadable. Nudging the position ratios
for narrow viewports (the first fix tried) still doesn't work: the cards
themselves don't fit side-by-side at that width, full stop. The real fix
was a **second, distinct render path** below the breakpoint — the same node
data rendered as a plain stacked list, no absolute positioning, no SVG
connector lines. Any component whose layout depends on absolute
positioning/canvas math relative to a container's pixel width needs a real
alternate render for narrow viewports, not a tuned version of the same math.

**Concrete example — grouped tag filter (`ProjectsView.vue`)**: filtering by
raw GitHub topics (`vue3`, `laravel`, `appscript`, …) is unusable past a
handful of tags — 25 flat pills with no structure. Grouped into labeled rows
(語言／套件／環境／其他) with a fixed-width label column (`w-16`) and a
wrapping pill row per group, each pill showing its real match count. Two
things worth carrying to the next tag-heavy list: topics/tags from an
external source (GitHub, npm, …) carry no inherent category — the grouping
is a hand-maintained lookup table, not something inferred from the tag
string itself, and it will drift as new tags appear unless someone revisits
it; and filter selection state should survive a list narrowing as long as
the current selection is still a valid match (only reset to the first result
when the selected item actually drops out) — jumping the selection on every
filter change reads as broken, not helpful.

## Typography — body prose

Long-form running prose (article body, the About page's origin-story
paragraphs) had been repeating the same class string (`text-[15px]
leading-8`) at every call site with no shared name and no consistent width
constraint — the same "the rule never got named, so it drifted" failure
this file already documents for `BaseEyebrow`/`BaseHint` above. Fixed
2026-09-23, after user-directed research confirmed the numbers themselves
needed to change, not just get named:

- **Size**: `text-base` (16px), not `text-[15px]` — readability research is
  consistent that body copy under 16px reads as too small for sustained
  reading.
- **Line height**: `leading-[1.6]`, not `leading-8` (2.0, the old value
  was higher than needed). The old value wasn't
  arbitrary: without a width cap, several of these blocks ran 90–100+
  characters per line, and the oversized line-height was silently
  compensating for that. Fixing width is the more fundamental fix — a
  value picked to compensate for a different bug isn't a value worth
  keeping once that bug is fixed.
  **Corrected 2026-11-13**: this bullet used to call 1.6 part of a "1.4–1.6
  WCAG-adjacent range". That is wrong: WCAG 2.2 SC 1.4.8 (AAA) asks for a
  line spacing of at least 1.5 within paragraphs, so 1.4 is below it, and
  the criterion sets no upper bound. For CJK text the evidence range is
  1.5–2.0 (W3C clreq §7.1.1.5). **Article body (`MarkdownBody.vue`'s
  `<p>`/`<li>`) is now 16px with a 28px line height (`text-base leading-7`,
  1.75)**, inside that range. Other prose (About) keeps `leading-[1.6]` for
  now. **Rest of the article page type scale (2026-11-13, after the type
  specimen)**: article title 36px/48px, h2 in the body 24px/36px, paragraph
  spacing 24px, footnotes 14px/24px (end notes, sidenotes and the expanded
  note box). The numbers live in one place, the `--article-*` variables at the
  bottom of `src/assets/css/variables.css` (shared by both themes; rem, so
  they follow the browser's font size). `MarkdownBody.vue` and
  `ArticleDetailView.vue` only choose which group an element reads
  (`text-(length:--article-body-size) leading-(--article-body-leading)` and
  so on); change a number there, not in the components. Added in the same
  pass (2026-11-16): h3 in the body is 16px bold (not enlarged), and the
  article's date, category and footnote numbers are labels at 13/20 with
  tracking 0.05em (`--article-label-*`; they were 11px at 0.24em, a style
  made for uppercase Latin). A footnote's superscript number takes the 13px
  size but keeps the `sup` line height of 0 so it does not widen the line. The evidence for the title line height, paragraph
  spacing and footnote size is weak to medium (one practice source and one
  small phone experiment); they are choices made for consistency and low
  risk, so revisit them if the live page reads too loose.
- **Width**: `max-w-prose` (65ch), replacing ad hoc pixel caps
  (`max-w-[760px]`, `max-w-[620px]`, `max-w-2xl`) that were never derived
  from the 50–75-character-per-line readability range, just picked to look
  reasonable. Apply it to the running-text block itself, not necessarily
  its containing section — a section can stay wider to hold a heading or a
  non-text element (a diagram, a classification table) at its own width;
  only the text needs the narrower cap.

Article reading width (2026-11-13): the article body column in
`ArticleDetailView.vue` is capped at `max-w-[40em]` (640px at 16px, about 40
CJK characters per line) instead of 65ch. `ch` is the width of "0", which
says little about a CJK line; `em` is one CJK character.

Applies to: `MarkdownBody.vue`'s rendered `<p>`/`<li>`, `ArticleDetailView.vue`'s
intro paragraph and article-body wrapper, `AboutView.vue`'s origin-story
paragraphs and opening lede. Does **not** apply to captions, eyebrows, or
short UI labels at smaller sizes (`text-[13px]`/`text-[13.5px]`/`text-[14px]`
elsewhere in `AboutView.vue`) — those are a different typographic role with
different constraints, not an oversight to fix the same way. Headline
typography (Fraunces) and eyebrow/mono labels were evaluated in the same
research pass and confirmed already correct — no change. (Superseded
2026-09-29 by D-60: Fraunces has no CJK glyphs, so Chinese headings were in
fact rendering in each device's fallback serif; headings moved to Noto Serif TC.)

## Typography — small-text floors (visitor-facing pages)

Set 2026-09-30 after the user found the home page text too small. Before,
full explanatory sentences sat at 12px and some labels at 9–10px.

| Role | Floor | Examples |
|---|---|---|
| Running prose | 16px (see above) | article body, About paragraphs |
| Full sentences a visitor reads | 14px (`text-sm`/`text-[14px]`) | page explanations, empty/error/demo-data notices, list-item titles |
| Secondary sans text | 12px | tech-stack lines, legends, popover rows |
| Mono uppercase labels (Latin/digits only) | 11px | dates, status badges, `STARTED`/`REPO` |
| Chinese labels | 13px, tracking ≤ 0.05em | 節點顏色, 語言／套件, 起點／終點, 所有文章 →, nav 淺色／登入 |
| Chinese section headings | 15px bold | 近期知識網路, 近況板, 路徑查詢 |

The 11px floor was first applied to Chinese labels too. The user caught it
the same day: 近期知識網路 at 11px was too small. The 11px/wide-tracking
style is designed for uppercase Latin. Chinese has no uppercase, and wide
tracking only pulls the characters apart. The mono font has no CJK glyphs
either, so those labels were falling back to the system sans anyway.

Copy rules checked in the same pass:
- Page subtitles take no trailing 。. Explanatory sentences under a
  section do.
- Visitor-facing text avoids developer vocabulary: hover, 邊, 型別,
  已實現, library names like `force-graph`, identifiers like `All_Essays`.
  Relations in the catalogue are 直接關係 and computed ones are 間接關聯.
  The earlier 登記的關係 was dropped: the user asked what it meant.
  The categories are 類別/三大類, never 型別.
- Graph line style follows the same split. 直接關係 is a solid `--edge-real`
  line on every graph. 間接關聯 is a dashed `--accent-secondary` line, home
  graph only. It was a paler gray dash first, but a reader review measured
  almost no visible change when the switch was turned on, so it now has its
  own color. Hover stays `--text-accent`, so the two never collide.
- Don't tell touch users to hover. Hover-only hints ("滑到節點上…") sit in a
  `[@media(hover:hover)]` span.
- Relation arrows are one-way. One arrow per direction, pointing from subject
  to object, labelled with that direction's predicate. Never draw a
  double-headed arrow labelled "specs / specifiedBy": nobody can tell which
  name goes with which direction. The backend's `uses` was defined backwards
  for months and got misread exactly this way (2026-09-30, user decision; the
  ER model diagram and the About class diagram were both changed).

Sources, and which parts are judgment:
- **11px label floor**: sourced. Apple HIG sets 11pt as the minimum text
  size, and Material 3's smallest role (Label Small) is also 11px.
- **14px sentence floor**: a design judgment, not a standard. Material 3's
  Body Small is 12px, so 12px is not wrong per se. The call is that CJK
  sentences at 12px are tiring to read. W3C clreq notes that small sizes
  are hard to read because of the complex structure of Chinese characters,
  but its numbers are for print.

Scope: this covers the pages a visitor reaches (home, articles, article
detail, projects, graph, layout and navbar). Admin forms keep the 10px
values that `BaseHint`, `BaseEyebrow size="field"` and `BaseTextarea` took
from the 文章編輯頁 mockup. That is a deliberate exception. It is not an
oversight.

## Motion

The site's motion policy (duration range, which pages may animate,
`transform`/`opacity` only, `prefers-reduced-motion`, banned techniques)
lives in `.claude/rules/ui.md` rule 2; this section does not repeat it, it
adds the rules and the token table below on top. Each rule names where it
was borrowed from: taste-skill v2.1.4 or v2.5.1 (MIT), or the section of the
motion demo (`docs/demos/motion-demo.html`) that fixed the number. Where the
site's own policy and an upstream rule disagree, the site's policy wins.

- **Every animation states its purpose in one line**, written in the issue or
  PR that adds it. No purpose, no animation. (v2.5.1, "Why it moves".)
- **Content stays complete without JS and under reduced motion.** Motion only
  adds to a page that is already whole at rest; it must never hide text a
  visitor could already be reading. (v2.5.1, "Why it moves" and Never list.)
- **Scrolling in: one deliberate moment per exploratory page, the rest stay
  still.** A whole exploratory page (Home, About) keeps a single deliberate
  entrance moment; every other section is already in place when it scrolls
  into view. No fade-in on each block: the same fade-up on every block is the
  tell. (Demo section (b), option C-1; v2.1.4 §9 "The same fade-up on every
  block"; v2.5.1 Never "a fade-in on every section".)
- **Hover movement only for fine pointers**:
  `@media (hover: hover) and (pointer: fine)`. Touch devices get no hover
  displacement; keyboard focus shows the same state everywhere. (v2.5.1
  `motion.md`; demo section (d).)
- **Don't animate `width`, `height` or `margin`.** They reflow the page;
  use `transform`/`opacity`. (v2.5.1 `motion.md` Never list.)
- **The focus ring does not animate.** It appears at once. (v2.5.1
  `motion.md` Never list.)
- **No overshoot.** No bounce, no curve that passes its mark. (v2.5.1
  `motion.md`, Curves.)
- **Enter and exit share one decelerating curve; exit is shorter.** An exit
  takes 60-80% of the matching entrance and uses the same curve, not an
  accelerating one. (v2.5.1 `motion.md`, which keeps one ease-out for
  entering and leaving; the 60-80% range is the site's reading of v2.1.4
  "exits 60-70% of the matching entrance", widened so every control token
  below lands inside it; demo section (a).)

### Motion tokens

Two tiers. The default tier is for controls (buttons, menus, panels) and uses
the control curve. The strong tier is for clickable-card hover/focus and
for the page's one deliberate moment (see the scrolling rule above); a card
grid may enter with the entrance and stagger tokens only when it *is* that
moment, never as cards scroll into view. Never use the strong tier on a button or a menu. All durations stay
inside the 100-400 ms range in `.claude/rules/ui.md` rule 2.

Curves:

| Token | Value | Use | Source |
|---|---|---|---|
| ease-control | `cubic-bezier(.2, .8, .2, 1)` | every control step: press, hover in / out, panel open / close, slide, card hover | taste-skill v2.5.1 `--ease`; demo section (a), v2.5.1 column; chosen in (c) |
| ease-enter | `cubic-bezier(.22, 1, .36, 1)` | entrances settling into place (quint-out) | taste-skill v2.5.1 `--m-ease-enter` (same value as v2.1.4 `--ease-out`) |
| ease-exit | same as the matching entrance | exits; no separate accelerating curve | v2.5.1 `motion.md`; demo section (a) |

Durations and distances:

| Token | Use | Value | Source |
|---|---|---|---|
| press | button pressed state | 100 ms | v2.5.1 `--m-press` is 90 ms; raised to 100 ms to meet the floor in `ui.md` rule 2 |
| hover-in | hover state coming on | 150 ms | v2.5.1 `--m-in`; demo section (a), v2.5.1 column; chosen in (c) |
| hover-out | hover state going off | 120 ms | v2.5.1 `--m-out`; demo section (a), v2.5.1 column; chosen in (c) |
| panel-open | menu or dropdown opening | 200 ms | v2.5.1 `--m-panel`; demo section (c) |
| panel-close | menu or dropdown closing | 120 ms | v2.5.1 `--m-close` (60% of panel-open); demo section (c) |
| slide | an indicator travelling | 240 ms | v2.5.1 `--m-slide` |
| entrance (strong) | the page's one moment entering (only as that moment) | 24 px rise, 320 ms, `ease-enter` | demo section (d), strong setting; curve from v2.5.1 `--m-ease-enter` |
| exit (strong) | the page's one moment leaving | 192-256 ms (60-80% of 320 ms), `ease-enter` | the exit rule above |
| card hover (strong) | a linked/clickable card lifting under a fine pointer or focus | 6 px up, scale 1.03, 200 ms, `ease-control` | demo section (d), strong setting |
| stagger (strong) | delay between sibling cards entering, only as the page's one moment; at most 3 siblings stagger, the rest enter with the third | 80 ms | demo section (d), strong setting |

Check of the exit rule against the table: hover-out is 80% of hover-in and
panel-close is 60% of panel-open.

## Operational screens

Rules for screens that show data to be read and compared (the admin page, the
stat tiles, the status board, the ontology lists, the projects filter), as
opposed to pages meant to be looked at. All four are from taste-skill v2.1.4
(MIT) `app-screens`; that file no longer exists upstream in v2.5.1, so these
will not be updated from there.

- **Numbers sit in a column, right-aligned, in tabular figures.** Use
  `tabular-nums` on any number that changes, is compared down a list, or sits
  in a fixed-width cell, so digits keep one width and columns do not jitter.
  Right-align a numeric column; left-align text.
- **Color goes on the data, not on the outline.** A status or a threshold is
  shown by coloring the value (or a small mark beside it), not by putting a
  colored border or background around the whole row or card. Keep to the
  existing tokens; errors use `--text-error` (see the
  destructive-action rule below).
- **Show 0 and empty as they are.** A count of 0 is written `0`, not hidden
  and not replaced by a dash; an empty list says it is empty (see
  `copy-language` for the wording). Don't fill a gap with placeholder numbers.
- **Balance headings.** Headings use `text-wrap: balance` (Tailwind
  `text-balance`) so a two-line title doesn't end on one orphaned word. As of
  2026-11-17 no heading in `src/` uses it yet; add it when touching a heading,
  not as a sweep.

Where `tabular-nums` is already used (9 files in `src/`, counted with
`grep -rl tabular-nums src` on 2026-11-17; copy the pattern from these):
- `src/components/BaseStatTile.vue`: the stat value (mono, large).
- `src/components/markdown/MarkdownBody.vue`: ordered-list markers (right-aligned
  in a column sized by the widest number) and inline superscript reference numbers.
- `src/features/admin/AdminView.vue`: counts in the admin summary.
- `src/features/home/KnowledgeGraphPanel.vue`: the document, technique,
  implementation and edge counts in the home graph sentence.
- `src/features/home/StatusBoardPanel.vue`: article dates.
- `src/features/ontology/OntologyScopesView.vue` and
  `src/features/ontology/OntologyScopeDetailView.vue`: the fixed-width call
  number column in the lists.
- `src/features/projects/ProjectsFilterGroup.vue`: counts in the filter
  chips.
- `src/features/projects/ProjectsMobileLayout.vue`: the tag count badge.

## Extending the token set

New tokens are sometimes genuinely needed (e.g. a color for the knowledge
graph's high-weight-node highlight). Default to reusing the existing
`--bg-*` / `--text-*` / `--border-*` families — new categories are allowed,
but talk it through first rather than adding one unilaterally. Uncontrolled
token growth is how a design system stops being one.

## Evaluating a visual decision

Aesthetic judgment ("does this look good") is necessary but not sufficient.
Run decisions through these lenses too — they catch different failure modes:

### Site positioning first (D-178)
Check this first; it does not override the contrast, accessibility and
interaction rules below. The site is an "external brain" whose form is grown
from what it holds; the four checks:
1. **Form grows from the data** — no decorative metaphor the data can't back.
2. **It visibly changes** — new things read, used or made change the form, and
   recent change is visible.
3. **Unexpected connections** — not only totals: an entry point from one item
   to related ones.
4. **One fixed anchor** — a stable statement or central subject says whose
   brain and what about (not a count).

Catalogue, index and archive describe how the content is *organised*; they are
not the positioning. For a page or a style direction (typeface, illustration,
palette), derive the criteria from the four checks, not from catalogue/library
imagery, and cite D-178 in the research or mockup brief. Sample text is real
copy from the site, not a phrase invented for its theme. The `IN / ARCHIVE`
wordmark stays; the internal theme names are neutral `light`/`dark`
(renamed from the old `library`/`terminal` code names) — neither is a style
criterion.

### Norman's affordance / signifier / feedback
- **Affordance & signifier**: does this element look like it does something —
  and if so, does it actually do that thing? A signifier that implies meaning
  the element doesn't have is worse than no signifier at all.
- **Feedback**: after an action, does the interface confirm what happened?
- **Conceptual model**: does the page's logic match what a user would assume
  about how this system works?

**Concrete example**: the navbar used to have an animated pulsing dot next to
the logo (`animate-pulse` on a circle). Pulsing circles read, by strong UI
convention, as live-status indicators (online/new-content/recording). This
one represented nothing — a false signifier. It was removed entirely rather
than just de-animated, because a static dot in that position still borrowed
the "record marker" glyph vocabulary used elsewhere (`● SYS_REGISTRY`-style
section markers) for a wordmark, which isn't a record — a category mismatch,
not just an animation problem. The breathing-glow CSS (`.beacon-dot` /
`@keyframes beacon-breathe` in `base.css`) was kept, reserved for a place
where it will represent something real: the knowledge graph's high-weight
node highlight, once that feature exists.

### NN/g's usability heuristics (the ones most relevant here)
- **Visibility of system status** — e.g. the theme toggle always shows which
  theme is active, not just an icon that implies "click to change."
- **Recognition rather than recall** — label the toggle with the theme's
  actual name (currently 明亮模式/暗黑模式, i.e. light/dark), not an icon the user has to learn.
- **Consistency and standards** — a shape/animation used for one meaning
  elsewhere on the site shouldn't be reused for a different meaning.
- **Aesthetic and minimalist design** — every element competes with the ones
  that actually matter for attention; an element with no justification should
  be cut, not rationalized into staying.

### Concrete interaction rules

These turn the lenses above into checks for every interactive element. They
use this project's tokens and `Base*` components — never raw Tailwind colors
like `bg-red-600`.
- **Clickable things look clickable, and nothing else does.** Buttons and
  links get a visible signifier (border, underline, hover change,
  `cursor-pointer`); plain text and decorative cards don't borrow button
  styling or hover lift.
- **Every action gives feedback.** A pressed state on buttons; anything async
  (API calls, login) shows a loading state right away — `BaseLoadingBlock`
  for content areas, a disabled/pending button for actions.
- **No double submits.** A submit/save button is disabled while its request
  is pending (`LoginView`'s `:disabled="submitting"` is the pattern).
- **Destructive actions confirm first.** Delete, overwrite or anything that
  can't be undone asks before acting and says what will be lost
  (`ArticleManageView`'s delete and `ArticleEditorView`'s file overwrite use
  `window.confirm` with that wording). Their styling must never read as the
  primary or positive action; it does not need a new red — see the
  `BaseTag` example above on reaching for a semantic color only when a real
  alert-level distinction exists. Errors use `--text-error`.
- **One primary action per area.** The main action uses `BaseButton`
  `primary`; secondary ones (cancel, back) use `ghost` or a text link, so the
  eye lands on the right first step.

### Avoiding AI-generated-design clichés
Both Anthropic's `artifact-design` skill and the official `frontend-design`
skill (`anthropics/claude-code`) name the same three defaults that AI-driven
design clusters around regardless of subject:
1. Warm cream background (~`#F4F1EA`) + high-contrast serif + terracotta accent
2. Near-black background + a single bright acid-green or vermilion accent
3. Broadsheet-style hairlines, zero border-radius, dense newspaper columns

None of these are wrong on their own — they're wrong when picked by default
rather than because the subject calls for them. Check new color choices
against this list explicitly. **This caught something real**: the first dark
theme candidate here used near-black + `#4ade80` acid green — a near-exact
match for cliché #2 — which is very likely *why* it read as generic/wrong
before anyone could articulate why. The fix wasn't "pick a different accent
color," it was grounding the hue choice in the subject itself (library
materials: walnut wood, brass, aged leather) rather than a generic dark-mode
default. (That 2026-09 reasoning is kept as history; ground new
choices in the D-178 checks above, not in library imagery.)

#### The list is dated and moves

Tells move with every model generation. Learn why each one reads as
machine-made instead of memorising the list, and read the list as a set of
signals: one tell proves little; clusters and repetition are the signal (taste-skill v2.5.1 `copy-tells.md`). This
list names tells, not replacements: it never says what to use instead, so it
cannot become the next default. Every entry carries the date it was added and
the source version. The three above were added 2026-08-22 (from the
`artifact-design` and `frontend-design` skills). The entries below were added
2026-11-17.

From taste-skill v2.1.4 (MIT), layout and component tells:
- **A pill badge floating above a heading** as decoration (a data count inside
  a filter chip is information, not this).
- **One word of a heading styled differently** (colored, italic, underlined)
  to fake emphasis.
- **A floating pill-shaped navigation bar.**
- **The same fade-up on every section.** See the Motion section's scrolling
  rule.
- **A row of identical cards, each topped by the same kind of icon.**
- **A gray-bar fake dashboard** used as a hero picture instead of real
  content.
- **Agency-style small print** used as decoration rather than as information (a section label that names the section, such as `BaseEyebrow`, is information).

From taste-skill v2.5.1 (MIT), motion and structure tells:
- **A card that tilts, flips, scales, follows the pointer or glows at the
  cursor; a magnetic button.** (The strong-tier hover lift in the Motion
  tokens is a fixed 6 px rise and 1.03 scale under a fine pointer, not this.)
- **Anything that advances by itself:** a carousel, an auto-advancing slider,
  timed tabs, a rotating notice, a logo marquee.
- **Blinking at random:** twinkling dots, glitter, flicker, hue cycling,
  scrambled text. Every change should show a state, a step or real data.
- **The section template:** every section being a small label, a claim
  heading, a short lede and three or four cards. The tell is the repetition
  down the whole page, not any one element of it.

**After removing a tell, check for over-correction.** Look for the habit that
replaced the one you removed (the plain card row that became a plain
two-column list, the cut animation that became a hard-coded static layout
with the same rhythm everywhere). Put real content in the gap, then re-read
the result as if you had not made the change. A rule that made the page worse
is broken on purpose. (taste-skill v2.5.1 `copy-voice.md` over-correction
check; written upstream for copy, applied here to visuals.)

## Generating a color palette (fallback method)

External color tools (coolors.co, thecolorapi.com, etc.) are frequently
unreachable from this environment — outbound network access here goes
through an org-level egress allowlist, and general color-tool sites are
outside it. Don't burn turns retrying them. Use this instead:

1. **Look for a real, vetted source before inventing one.** A hand-picked hex
   value is a guess; a color scheme that real projects have used and tuned
   for readability is evidence. GitHub is reachable even when arbitrary
   sites aren't — the `base16` project (`tinted-theming/base16-schemes` and
   similar repos) hosts dozens of named, structured color schemes (Gruvbox,
   Solarized, etc.) as plain YAML with real hex values, ready to map onto
   this project's token names. Prefer this over guessing whenever a named
   palette plausibly fits the subject.
2. **If a genuinely new hue is needed**, generate it with actual HSL math
   from a subject-themed seed hue (rotate hue, hold saturation/lightness
   deliberate) rather than recalling hex codes from memory — reproducible
   and checkable beats "this looks about right."
3. **Always compute real WCAG contrast**, don't eyeball it. Relative
   luminance → contrast ratio is a simple formula; check every text/background
   pairing against AA (4.5:1 body text, 3:1 large text/UI components). A
   palette that "looks readable" in isolation can fail this outright,
   especially muted/secondary text colors.
4. **Run the AI-cliché check** (above) against the result — a uniform
   saturation/lightness formula applied across hues tends to land on "neon"
   for green/red even when the same formula reads as "warm/rich" for amber,
   because human color perception isn't uniform across hues at matched HSL
   values. Desaturate specifically where a result reads neon rather than
   aged/muted, especially for green and red-orange families.
5. **Present candidates as actual solid color swatches**, not text colored
   on a shared dark background — a swatch you can't visually distinguish
   from its neighbor at a glance has failed its one job, no matter how
   correct the underlying hex value is.

## Setup and process notes

- This project's `CLAUDE.md` (repo root) carries the language convention
  (commit messages/comments/replies default to Traditional Chinese) —
  cross-linked here rather than duplicated.
- Exploratory visual work (new theme candidates, unproven directions) follows
  the general engineering principle: open a branch before writing any code,
  not after.
- Implementing *from* a design mockup (this project's Claude Design canvas,
  or any other visual spec with concrete style values) follows the
  `mockup-fidelity` skill (from the project's skills marketplace):
  extract exact values instead of eyeballing the nearest Tailwind default,
  and verify with `getComputedStyle` rather than a screenshot alone —
  screenshots only catch structural problems (duplication, misalignment),
  not small numeric drift in the values documented in this file.
