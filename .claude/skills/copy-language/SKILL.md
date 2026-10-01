---
name: copy-language
description: This project's (my-dev-grid-front) copy language — the voice, the settled terms, and the format rules for every visitor-facing word on the site (page titles and subtitles, section explanations, labels, graph wording, empty/error states). Use this whenever writing, changing or reviewing copy here, before proposing candidate wording to the user, and before a copy change goes to the ux-review pass. The visual counterpart is `visual-design-language`; this file owns words, that one owns looks.
---

# Copy Language

Status: **draft, 2026-10-01** — written by the main session from the site's live copy and the
decision register; not yet reviewed by the user. Items marked **(to confirm)** are not rules yet.

Why this exists: copy decisions kept being made one page at a time with no shared reference, and
the same mistakes recurred — `specs` shipped as 「寫到」 straight from a mockup (D-73), 「登記的關係」
needed renaming because the user didn't understand it (D-70), the site name was asked twice
(D-32/D-65), and a projects-page subtitle proposal came out too plain. Each was a voice or
terminology question nobody had written down. (`engineering-principles.md`, 2026-10-01 addendum:
visitor copy is not a "local detail".)

## How this fits with the other tools

| Tool | Owns |
|---|---|
| this skill | what the words should be: voice, settled terms, formats |
| `visual-design-language` | how they look: sizes, weights, colour (incl. D-68's size floors) |
| `mockup-fidelity:ux-review` | whether a reader actually gets it — runs on every visitor copy change (D-69) |
| Anthropic `design:ux-copy` ([source](https://github.com/anthropics/knowledge-work-plugins/blob/main/design/skills/ux-copy/SKILL.md)) | generic UI patterns (buttons, errors, empty states), borrowed below; it explicitly needs a voice and terminology from outside — this file is that |

## Voice

Grounded in what the site already says (About, home), not invented:

- **First person, plain.** About: 「只收我自己寫過的文章、用過的技術、做過的專案。」 Say what is there,
  in the author's own voice. No marketing register (打造, 賦能, 一站式, 探索…的旅程).
- **Catalogue vocabulary, because the site is a catalogue.** 目錄, 編, 類別, 關係 are literal
  descriptions of how the site works — About: 「這套分類和雙向關係，來自我的圖書資訊學背景」 — not
  decoration. Home: 「私人藏書，公開目錄」; 「文章、技術與專案，編成可以查詢的目錄」. Use this vocabulary
  where it is literally true; don't stretch it onto things it doesn't describe.
- **Specific over general.** A line that could sit on anyone's site (「做過的專案與技術」) is too plain
  even if correct. Prefer the detail only this site has.
- **Short.** Fewest words that keep the meaning (ux-copy principle 2).

## Settled terms — check here before choosing a word

| Use | Not | Source |
|---|---|---|
| `IN / ARCHIVE` (site name, tab title, wordmark) | `jerrylib`, `Jerry in Archive`, `My Dev Grid` | D-32, D-60, D-65 |
| 直接關係 (recorded, solid line) / 間接關聯 (computed, dashed, home only) | 登記的關係, 推導關聯 | D-70 |
| 類別, 三大類 | 型別 | D-68 |
| Relation verbs from the two endpoint classes: 文件**說明**技術, 文件**記錄**實作, 技術**用在**實作 | per-predicate glosses; 「寫到」 for `specs` | D-73 (full table still open) |
| Page titles as they are, English included (`My Articles`, `Production Artifacts`) | translating titles to Chinese | D-76 |

**(to confirm)** About's body uses 登記 as a verb (「都登記在目錄裡」). D-70 dropped it as a *label*;
whether the verb in a full sentence reads fine is unverified — ask before reusing it elsewhere.

When a new term is settled with the user, add a row here **and** a decision-register row.

## Formats

**Page subtitle** (the line under a page title)
- Describes what the page holds. **No usage instructions** — the controls are visible already
  (the user rejected 「…，可以用技術篩選」, 2026-10-01).
- Put the information-carrying words first: "if users see only the first 2 words, they should
  still get the gist" ([NN/g](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/)).
- No trailing 。 (D-68).
- Parallel with sibling pages: `My Articles` → 「開發筆記與技術文章」.

**Section explanation** (a sentence or two under a section heading)
- Full sentences, end with 。 (D-68). Explain what the reader is looking at and how to read it
  (colour, size, lines), not how it was built (D-76).

**Admin pages** (article manage/editor, ontology edit pages — behind login)
- **Functional wording is fine; the voice rules above don't apply.** The author is the only user
  for now. The user, 2026-10-01: 「後台文案可以隨意或功能性一點 反正現在只有自己用」 (D-81).
  No ux-review pass needed for admin-only copy (D-69 covers visitor-facing copy).
- Settled terms (the table above) still apply, so the same thing isn't named two ways.
- Revisit if anyone else gets an account.

**Interactive microcopy on visitor pages** (patterns from `design:ux-copy`)
- Errors: what happened + why + what to do (「文章清單載入失敗，重新整理再試一次。」 already follows it).
- Empty states: what this is + why it's empty + how to start, when there is a way to start.

## Claims must match the data

Every concrete example, number, project name or relation in copy must exist in the real data
(API, seeders, the synced GitHub projects). Check before proposing, not after a reader catches it.
Real case: About's example 「這篇文章說明 Vue 3」 has no matching article in the data (reader review,
2026-10-01). (Idea borrowed from the Copywriting Editor Kit plugin's claims-vs-evidence check;
the plugin itself was not installed.)

## Don't

- Developer vocabulary in visitor copy: hover, 邊, 型別, 已實現, library names, identifiers (D-68).
- Tell touch users to hover.
- Usage instructions in subtitles (above).
- English predicate names on visitor pages outside the places D-73 allows.
- **(to confirm)** Fake metaphors — imagery the page doesn't actually have (listed as a pending
  editorial rule since 2026-09-29; the original wording mentions a drawer-style metaphor).

## Process

1. Check this file and the decision register for settled terms.
2. Draft 2–3 candidates, each with a one-line reason tied to a rule above; verify any claim
   against the data.
3. Run `mockup-fidelity:ux-review` on the running build or mockup (D-69).
4. The user picks; record a new term or rule here and in the decision register.
