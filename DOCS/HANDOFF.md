# Handoff
_Updated: 2026-09-28 10:42, by Claude Code (Opus 5.5)_

## Goal
- Work through [TODOLIST.md](TODOLIST.md): Services section, Media Showcase, brand rename 8Ball Studio → 8ightBall Studio.

## Done
- Studio title → "8ightBall / Studio"; Contact foot → "8ightBall Studio" ([src/App.jsx](../src/App.jsx)). Browser-checked.
- T/B gap in "8ightBall": `CueLine` adds `.is-joined-cap` to a capital after a lowercase letter; `margin-left: 0.07em` ([src/styles.css](../src/styles.css)). All Looks. Browser-checked.
- Haruplate board now white like other boards: removed `is-haruplate` overrides in styles.css, acid.css, downlight.css; dropped `type: 'haruplate'`.
- New **Services** Page between Studio and Projects (Story: Intro → Studio → Services → Projects → Contact):
  - Six services from TODOLIST, numbered ruled list, title "OUR / SERVICES".
  - Services rises over held Studio (took Projects' handoff margin); Projects rises over Services (shrink + `.services-shade`).
  - Main: felt `#0b5b3b`; Cyc Wall: blue gel `#2f6fe4`; Pool Table: list on cloth, phone upright table shows names only.
  - Header link "Our services" (hidden < 560px). `servicesTop` in layout, `services` Page, `sectionAt` services, theme colours, cursor section.
  - Verified: `npm test` 102/102 pass; `npx vite build` OK; playwright-core screenshots 3 Looks × 1440×900, 390×844, 375×667, 844×390; header links land at section top 0; no console errors, no x-overflow.
- DESIGN.md + CONTEXT.md updated for Services.

## In progress
- None.

## Next steps
1. User review of Services copy (detail lines written by Claude except AI one) — see Open questions.
2. TODOLIST §2 Media Showcase (video, image, AI media) — not started.
3. Remaining "8 Ball Studio" strings: `index.html` `<title>` + meta description; logo alt/aria-label, story aria-label, contact item aria-labels, Preloader text ([src/App.jsx](../src/App.jsx), [src/components/Preloader.jsx](../src/components/Preloader.jsx)).
4. Commit when user asks.

## Decisions
- Services = one-screen Page, not gpt-taste full AIDA page / pinned split: DESIGN.md wins (one face, one title per Page, Sheet Rule).
- Title top-left + list offset right (12-col grid): Main's wide Space Grotesk title doesn't fit a side-by-side split.
- Felt ground for Services in Main: distinct sheet between ink Studio and paper Projects; acid on felt ~5:1.

## Open questions
- Detail copy OK? "Brand films, reels and short-form edits", "Brand assets, social posts and print", "Paid campaigns, tracked and tuned", "Calendars, posting and community", "Websites and landing pages".
- Update Studio footer + Intro `SERVICES` (old 3: "Social content management", "Video & photography", "Graphic design") to new list?
- Rename remaining "8 Ball Studio" strings (Next steps 3)?

## Key files
- [src/App.jsx](../src/App.jsx): `SERVICE_ITEMS`, Services markup, `measureStoryLayout`, header nav.
- [src/motion/flowMotion.js](../src/motion/flowMotion.js): handoffs 1a Studio→Services, 1b Services→Projects, row reveal.
- [src/storySchedule.js](../src/storySchedule.js): Page list + layout order.
- [src/styles.css](../src/styles.css), [src/looks/acid.css](../src/looks/acid.css), [src/looks/downlight.css](../src/looks/downlight.css): Services per Look.

## Gotchas
- `npx playwright test` hangs on Node 26: drive `node_modules/playwright-core/index.mjs` from a script instead. Specs in `tests/browser/` not run; `localhost-smoke.spec.js` updated for Services, `draft2-benchmark.spec.js` references a pagination UI that no longer exists (stale, untouched).
- Port 5199 used by another dev server; used `npx vite --port 5287`.
- `?benchmark=1` exposes `window.__storyNavigationBenchmark.goToPage(id)` for screenshots.
- `PRODUCT.md` + `src/storyStage.js` had uncommitted edits before this session (only a storyStage comment changed by Claude).

## Uncommitted
- All work above is uncommitted, unreviewed: run `git status --short` / `git diff` for the list (18 modified, `DOCS/TODOLIST.md` + `DOCS/HANDOFF.md` untracked as of 10:42).

## Agent setup (outside repo, this session)
- Global rules: `/Users/sloth/AGENTS.md` (caveman-short replies; changed-files list at end of every file-editing reply; never commit unless told). User checks these closely.
- Claude output style `Caveman` (`~/.claude/output-styles/caveman.md`) is active.
- Shared `handoff` skill (`/Users/sloth/.agents/skills/handoff/SKILL.md`) writes this file. No hook or AGENTS.md rule auto-loads it: read it by hand at session start.

## Suggested skills
- `taste-skill` or `gpt-tasteskill`: Media Showcase layout ideas (DESIGN.md + CONTEXT.md still win: one face, one title per Page, Sheet Rule).
- `run`: start the dev server and screenshot changes in all three Looks.
- `code-review`: review the uncommitted Services diff before the user commits.
- `handoff`: update this file before the next clear.
