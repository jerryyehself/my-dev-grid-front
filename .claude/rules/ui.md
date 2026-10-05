---
paths:
  - "src/**/*.vue"
  - "src/**/*.css"
  - "src/assets/**"
  - "index.html"
---

# UI changes: rules that apply the moment you touch a page

Loaded only when a Vue/CSS/asset file is read or edited (2026-10-05, D-95 in `my-dev-grid-skills/docs/decision-register.md`). The full rules live elsewhere; this file is the reminder that reaches whoever is actually editing, including subagents.

1. **Mockup first.** A new page, a layout change, or a visible restyle needs a user-selected mockup before code: mockup → `mockup-fidelity:ux-review` → the user picks → implement → `mockup-fidelity:fidelity-check`. No selected mockup for a visible change → stop and report, don't design it in code. Internal refactors, bug fixes that restore the intended look, and copy-only fixes are exempt (copy still follows rule 3).
2. **Motion is conservative (D-93).** Use the shared motion tokens (mostly 100–400 ms; enter decelerates, exit accelerates and is shorter); animate `transform`/`opacity` only; `prefers-reduced-motion` disables all of it. Only the exploratory pages (Home, About) may get entrance/narrative motion; task-oriented ones (article reading, admin, editors, the `/graph` canvas, 404) get none or almost none. No smooth-scroll libraries (Lenis etc.), parallax, scroll-jacking, image-sequence scrolling or intro animations. Check LCP/INP after adding motion.
3. **Words and look have their own skills.** Visitor-facing text → `.claude/skills/copy-language`. Colours, type, spacing, components → `.claude/skills/visual-design-language`. Read the relevant one before changing either.
4. **Third-party logos are used unmodified** — no recolouring, cropping, effects or animation on the logo itself (`daily-claude-summary/reports/developer-site-visual-style-and-tech-logos.md`).
