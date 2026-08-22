---
name: visual-design-language
description: This project's (my-dev-grid-front) visual design language and the method for extending it — how a style decision turns into design tokens, then a component rule, then an architecture pattern, then something that holds across the whole site. Use this whenever making or evaluating a visual/UI decision here — new component styling, a new theme or color palette, typography, icons, animation, or reviewing whether an existing element's look is justified. Also covers the fallback method for generating color palettes when external color tools are unreachable, and the evaluation lenses (Norman's design principles, NN/g heuristics, common AI-generated-design clichés) to run every visual decision through.
---

# Visual Design Language

This project isn't a portfolio site — it's an externalized "brain" for knowledge
management and idea incubation. That framing is why visual decisions here get
checked against more than taste: a choice that looks fine but doesn't mean
anything (see the nav dot example below) is a bug, not a style preference.

**Current themes**: `.theme-library` (default) is the shipped "現代木質圖書館風".
`.theme-terminal` is the shipped "夜讀" theme, toggled via `useTheme.ts` /
`ThemeToggle.vue` — currently filled with a Gruvbox-sourced palette (see
"Generating a color palette" below for why). Three other fully-worked,
WCAG-checked candidate palettes for that same `.theme-terminal` slot are kept
ready to paste in at `references/alternate-palettes.md` — swapping the theme
later means replacing the values inside `.theme-terminal`, not renaming
anything or touching the toggle logic.

## The chain: tokens → component rule → architecture → whole site

Every visual decision should be traceable through four layers. Skipping a
layer is usually how inconsistency creeps in.

1. **Tokens.** Colors live in `src/assets/css/variables.css` as semantic CSS
   variables — `--bg-*`, `--text-*`, `--border-*` — not literal hex values in
   components. Two themes are already defined there (`:root`/`.theme-library`
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

4. **Whole site.** A decision isn't done until it's checked in *both* themes.
   A hardcoded color that happens to look fine against one theme's paper color
   is exactly how bugs like the one below happen.

**Concrete bug this caught**: `MainLayout.vue`'s page title, sticky-header
background, and footer were hardcoded to `text-stone-950` / `bg-[#f4f0e1]` /
`border-stone-200` instead of tokens. Both shipped themes (library, cyber)
happen to have light paper backgrounds, so it never showed — until a dark-paper
theme candidate made the title unreadable (near-black text on near-black
background). Fixed by routing all of it through `--text-ink-main` /
`--bg-paper-dark` / `--border-shelf`. When evaluating a new theme candidate,
re-check `MainLayout.vue`, `TheNavbar.vue`, and `SiteFooter.vue` render
correctly — a theme that only works on paper-colored content is validating an
incomplete design.

**Also found, not yet fixed**: `SiteFooter.vue` is a real component but isn't
imported anywhere — `MainLayout.vue` has its own inline `<footer>` with
different copy. One of them should go; note it here rather than silently
picking one next time this file gets touched.

## Extending the token set

New tokens are sometimes genuinely needed (e.g. a color for the knowledge
graph's high-weight-node highlight). Default to reusing the existing
`--bg-*` / `--text-*` / `--border-*` families — new categories are allowed,
but talk it through first rather than adding one unilaterally. Uncontrolled
token growth is how a design system stops being one.

## Evaluating a visual decision

Aesthetic judgment ("does this look good") is necessary but not sufficient.
Run decisions through these lenses too — they catch different failure modes:

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
  actual name (currently 晝間/夜讀), not an icon the user has to learn.
- **Consistency and standards** — a shape/animation used for one meaning
  elsewhere on the site shouldn't be reused for a different meaning.
- **Aesthetic and minimalist design** — every element competes with the ones
  that actually matter for attention; an element with no justification should
  be cut, not rationalized into staying.

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
default.

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

- This project has no `CLAUDE.md` yet; when one exists, cross-link it here
  rather than duplicating the tech-stack/architecture description.
- Exploratory visual work (new theme candidates, unproven directions) follows
  the general engineering principle recorded in the `my-dev-grid-skills`
  marketplace repo (`docs/engineering-principles.md`): open a branch before
  writing any code, not after.
