# SPEC: Fluid scroll, three looks, Huge-style choreography

Repo: `/Users/sloth/ALL PROJECTS/8Ball_Studio` (main @ 0bc8bbb). Grilled over 5 rounds on 2026-09-25. Phase 0 saves this file as `DOCS/SPEC_FLUID_SCROLL_AND_LOOKS.md`.

## Context

The owner wants the site to feel as fluid as hugeinc.com: weighted scroll, sections with their own themes, and motion everywhere. Today, after the pinned Intro → Studio stage, Projects and Contact are static full screens (the contract says "nothing moves but the scroll"). Eleven draft-quality looks sit in a dropdown.

**What Huge does** (read from its live bundle):
- **Scroll:** Lenis at its defaults (`new Lenis({ autoRaf: false, anchors: true })`, GSAP ticker, `lagSmoothing(0)`, only when reduced motion is off), with tight scrubs (`true`, `0`, `0.5`).
- **Themes:** `ThemeScroll` swaps 5 palettes (CSS vars) per section at the viewport centre, over a 0.5 s transition. The nav re-themes at the header line.
- **Choreography:** line-mask title reveals, staggered reveal groups, stacking project cards, a footer that parallaxes up from −25%, and a cursor label (`data-cursor-marquee-text`).
- **Takeaway:** Huge's weight comes from choreography. We borrow its mechanisms but keep the heavier glide the owner chose.

**Outcome:** three looks share one motion system:
- **Looks:** Acid Night (the default, restored from commit 91fcc52), Cyc Wall and Downlight.
- **Motion:** a heavy Lenis glide, scroll-linked handoffs between every section, a pinned horizontal Projects run, and Contact revealed from under Projects.
- **Extras:** velocity skew, a cue-ball cursor, a preloader, and a dev-only `?tune` panel.

## Decisions (grilling log)

| # | Topic | Decision |
|---|---|---|
| 1 | Looks | Public native "Look" dropdown with 3 entries in this order: **Acid Night (default)**, Cyc Wall, Downlight. Delete the other 8 looks (baize, crucible, develop, chit, film, noir, flap, poster, marker). |
| 2 | Acid Night | The 91fcc52 design: `--ink #070908`, `--paper #f2f1e9`, `--acid #b7d95b`, `--felt #0b5b3b`. Titles in Space Grotesk 700 caps (tracking −0.075em, line-height 0.72); labels in DM Mono; faint acid radial glows. Fonts are self-hosted; the old Google `@import` is dropped. |
| 3 | Section themes | Only Acid Night swaps palettes per section: Studio **ink** (paper type, acid glow) → Projects **paper** (ink type) → Contact **full-bleed acid** (ink type). Cyc Wall keeps its pink/teal/amber gels; Downlight stays green. |
| 4 | Motion scope | One shared markup and motion system for all 3 looks. Each look supplies only tokens and its Studio cue. The "static sections" rule is retired. |
| 5 | Scroll weight | Lenis `lerp 0.05`, `wheelMultiplier 0.8`. GSAP scrub is **1.2 s on the pinned stage** and **0.6 s for section choreography**. |
| 6 | Mobile | Native touch momentum (`syncTouch: false`), with full choreography at shorter distances. |
| 7 | Intro Drafts | The public Draft switcher stays (01 3D POV / 02 3D Break / 03 Original). Every draft must hand off cleanly. |
| 8 | Handoffs | Studio → Projects: **rise/shrink**. Projects rises over (yPercent 8→0) while Studio shrinks (scale .965, yPercent −2) and dims. In Acid Night, the background colour also morphs in oklab. Projects → Contact: **reveal from under**. Contact's inner content rises from yPercent −25 to 0 and a shade lifts. |
| 9 | Projects | A **pinned horizontal run** of 6 boards: 4 clients, then two link boards, "Your brand, next →" (Contact) and "@8ightball.studio: more on Instagram" (IG). No invented work. |
| 10 | Media | None yet. Logos only; never fabricate. |
| 11 | Skew | **Everything in flow** skews with Lenis velocity: all Projects and Contact content, with skewX on the horizontal track. The default clamp is ±4°, tunable in `?tune`. The pinned stage (3D intro, Studio cue) and fixed chrome never skew. |
| 12 | Cursor | On fine pointers, a **cue ball replaces the cursor**. It grows into a pill label from `data-cursor` ("Scroll to break", "Message", "Follow", "Write", "Contact", "Instagram"). Its colours come from the section theme, and the native cursor returns over the switchers and selects. Touch is unaffected. |
| 13 | Preloader | Shows only while fonts and the active Draft load: at least 600 ms, at most 2.5 s, **once per session** (sessionStorage, wrapped in try/catch). Lenis is stopped while it shows. |
| 14 | Tuning | A dev-only `?tune` panel (lazy chunk) with sliders for lerp, wheelMultiplier, stage and section scrub, and skew max/gain, plus "Copy values" for `storyTiming.js`. |

**Locked defaults, stated so you can object at approval:**
- With `prefers-reduced-motion: reduce`, Lenis is not created (native scroll, as Huge does) and there is no skew, run, handoff or morph. Sections show their palettes statically and the Projects boards wrap into a grid.
- In Acid Night, `<meta name="theme-color">` and the header ink follow the section under the header.
- The orphaned `src/assets/looks/macro/` and every font file not used by the 3 kept looks are deleted. All of them are tracked in git at 0bc8bbb.

## Design

### Timing contract (`src/storyTiming.js`)
- **`scroll`:** `lerp 0.05`, `wheelMultiplier 0.8`, `scrubSeconds 1.2` (stage), and a new `sectionScrubSeconds 0.6`.
- **`pages`:** add `handoffScreens: 1`. `releaseEnd = studioStable + studioReleaseHold + handoffScreens / viewportsPerUnit`. The story grows by one screen, so Projects can rise over a Studio that is already fully lit. Studio still holds alone for `studioReleaseHold` first.
- **New `flow` group** (validated numbers, extended in `merge()`):
  - `riseYPercent 8`, `shrinkScale 0.965`, `shrinkYPercent -2`, `shrinkDim 0.35`
  - `contactRevealYPercent -25`, `contactShade 0.6`
  - `skewMaxDeg 4`, `skewGain 0.35`, `skewSettleSeconds 0.4`
  - `cursorLagSeconds 0.18`
  - `preloaderMinMs 600`, `preloaderMaxMs 2500`

### Shared motion (all looks)
- **Studio → Projects:** `.projects-screen` gets `margin-top: -100svh` and sits above the sticky stage. A trigger on `.projects-screen` (`top bottom` → `top top`, section scrub) shrinks and dims `.title-screen`. Projects content rises. Its title letters unmask by line (yPercent 115→0, the 91fcc52 move) inside the existing `CueLine` spans, which keep Cyc's per-letter key-light shadows.
- **Projects run:**
  - Layout: CSS sticky, the same approach as the existing stage, not a ScrollTrigger pin (avoids pin-spacers under `scrollerProxy`). Structure: `.projects-screen` (height `calc(100svh + var(--run-distance))`) → `.projects-sticky` (100svh) → `.projects-track` (flex row).
  - Motion: JS measures `--run-distance` on refresh and scrubs the track's `x`. Each board gets a `--lift` value (0..1) through `containerAnimation`, and each look's CSS turns `--lift` into its own effect: Cyc leans the board upright, Downlight deepens its shadow and scale, Acid raises it on a shadow.
  - Keyboard: focusing a link board scrolls the run to it.
- **Projects → Contact:** `.contact-inner` goes from yPercent −25 to 0 and `.contact-shade` fades from 0.6 to 0 (`top bottom` → `top top`). Projects has the higher z-index. Contact rows stagger in (y 20→0), as in 91fcc52.
- **Depth:** titles drift slower than floors and tracks, and walls or tables push in slightly (scale ≤1.04), all at section scrub.
- **Acid backdrop morph:** one scrubbed CSS var `--theme-t` (0 Studio, 1 Projects, 2 Contact) on `.experience`. `acid.css` derives `--theme-bg` with nested `color-mix(in oklab, …)`. Acid section surfaces use `var(--theme-bg)`, so every visible surface morphs together; each section's ink stays fixed, so ink type appears as the paper arrives. Register `--theme-t` with `@property` as `<number>`.
- **Nav and meta:** per-section triggers at `top top+=64` set `data-nav-theme` on `.site-header` (0.5 s ink transition) and write `themeColors[section]` from the registry into `meta[name=theme-color]`.

### Looks (`src/looks/`)
- **`lookRegistry.js`:**
  - Entries: `acid`, `cyc`, `downlight`, in that order; `DEFAULT_LOOK_ID = 'acid'`.
  - Acid's motion: a new `fade` reveal (opacity, `ease: 'none'`), entrance `{ yPercent: 115 }`, `letterFrom: 'start'`, `letterEase: 'power3.out'`, label `{ autoAlpha: 0, y: 20 }` / `power2.out`.
  - Every look gets `themeColors` for intro, studio, projects and contact.
  - `REVEALS` drops every shape except `circle`, `canopy` and `fade`.
- **`acid.css`** (new, scoped to `.experience[data-look='acid']`): ports the 91fcc52 values onto today's markup (source: `git show 91fcc52:src/styles.css`). Board cards on paper become white cards with an ink hairline; Haruplate gets an ink card. Contact is the 3-column list, stacked on compact screens.
- **Fonts:** add `space-grotesk-latin-var.woff2` and `dm-mono-{300,400,500}-latin.woff2` (OFL) to `public/fonts/` and to `LICENSE.md`. Preload Space Grotesk in `index.html` instead of Schibsted.

## Implementation phases

0. **Spec:** copy this plan to `DOCS/SPEC_FLUID_SCROLL_AND_LOOKS.md`.
1. **Looks consolidation:**
   - Add Acid Night: `acid.css`, fonts, registry entry, `index.html` preload.
   - Delete the 8 look sheets, the marker scenery in `LookScenery.jsx`, the unused `@font-face` rules in `looks-base.css`, the unused fonts and the macro assets.
   - Update the `main.jsx` imports and `lookRegistry.test.js` (3 ids in order, default `acid`, `themeColors` present). Drop the "no per-Page transitions" assertion.
   - Check: `npm test`, `npm run build`, all 3 looks render statically.
2. **Scroll engine:**
   - `storyTiming.js` values plus the `flow` group and `handoffScreens`; update `storyTiming.test.js`.
   - `storyNavigationBrowser.js`: create Lenis only when reduced motion is off. Expose `getVelocity()`, `stop()`, `start()` and `setFeel({ lerp, wheelMultiplier })`. `setFeel` writes `lenis.options.lerp` and `lenis.virtualScroll.options.wheelMultiplier`.
   - Pass the new methods through `useStoryPager.js`.
   - Update `DOCS/GSAP.md`.
3. **Section choreography:**
   - New `src/motion/flowMotion.js`: `createFlowMotion({ root, look, compact })` builds the handoffs, run, reveal, depth, Acid morph and nav/meta triggers. It is called inside App's existing `gsap.context` / `matchMedia` in the `[activeLook]` layout effect, so `revert()` cleans it up.
   - New `src/motion/flowMath.js`, pure and tested: run distance, board-to-scroll target, theme stop mapping, skew mapping.
   - `App.jsx` markup: `.projects-sticky`/`.projects-track` with the 2 link boards (links carry clear text, and the clients stay in a list labelled "Clients"); `.contact-inner`/`.contact-shade`; `.skew-layer` wrappers (skew never shares an element with GSAP inline transforms); `data-cursor` attributes.
   - `styles.css`: overlap, run and reveal stacking, plus the reduced-motion fallbacks.
   - Per-look `--lift` and surface rules in `styles.css` (cyc), `downlight.css` and `acid.css`.
   - Add a `storySchedule.test.js` case for the overlap (`projectsTop == pinnedRange`).
4. **Extras:**
   - `src/motion/velocitySkew.js`: the adapter's `onScroll` velocity feeds `gsap.quickTo`, which writes `--flow-skew` and `--flow-skew-x`.
   - `src/components/CursorBall.jsx` (reuses the key-light `quickTo` pattern from `App.jsx`).
   - `src/components/Preloader.jsx`: the drafts expose an optional `controller.ready` promise (`PoolPovDraft.jsx` plate decode, `PhotorealPoolDraft.jsx` first frame), with the window `load` event as fallback.
5. **Tune panel:** `src/components/TunePanel.jsx` via `React.lazy`, mounted only with `?tune`. New `src/motion/runtimeTuning.js` holds overrides; the scrub values read from it, and triggers rebuild when a slider is released.
6. **Docs and tests:**
   - `DESIGN.md`: Acid Night becomes the primary system, with a Motion section; Cyc Wall and Downlight are condensed as alternates.
   - `PRODUCT.md`: operating context (free scroll, looks).
   - `CONTEXT.md`: add the terms Look, Handoff and Run.
   - `.impeccable/surfaces/src-app-jsx.md`: the scroll-model line.
   - `package.json`: add the new test files to the test script.
   - `tests/browser/localhost-smoke.spec.js`: extend it (see Verification).

## Reuse
- `CustomEase 'cue'`, `finishScrubCatchUp`, `measureStoryLayout`, and the key-light `quickTo` pattern, all in `src/App.jsx`.
- `getStoryPages` / `getStudioStartUnits` (`src/storySchedule.js`), and `pageAtProgress`, which picks the indicator page (`src/storyNavigation.js`).
- `REVEALS.circle` / `canopy`, `getRevealVars`, `normalizeLookId` (`src/looks/lookRegistry.js`).
- The adapter's `onScroll` / `scrollTo` / `refresh` (`src/storyNavigationBrowser.js`).
- `DraftSwitcher` and `LookSwitcher` stay unchanged.
- The 91fcc52 sources through `git show 91fcc52:<path>`.

## Verification
- `npm test`, `npm run build` (only the known Three.js chunk warning), `git diff --check`.
- **Playwright smoke** at 1440×900 and 390×844:
  - The default is `data-look="acid"` and the dropdown order is Acid Night / Cyc Wall / Downlight.
  - "Our Projects" lands at the start of the run, and scrolling moves the track.
  - "Contact Us" lands with Contact fully revealed.
  - No page errors.
  - With reduced motion emulated: no `html.lenis`, the boards show as a grid, and the palettes are static.
- **Smoothness:** scripted wheel scrolling through both handoffs and the run, sampling rAF deltas, with at most 2% of frames over 20 ms at 1440×900. Reuse the draft benchmark pattern.
- **Screenshot sweep** (to `output/playwright/`, which is gitignored): each look at intro, Studio, handoff midpoint, run midpoint, Contact-reveal midpoint and Contact, at both sizes.
- **Manual:** all 3 Drafts hand off to Studio and then Projects. `?tune` changes the feel live and copies values. The cursor labels and the once-per-session preloader behave as specified.
- Nothing is committed; the changes are left for review.

## Implementation record (2026-09-25)

All phases (0–6) are implemented and uncommitted.

### Delivered
- **Looks:** Acid Night (91fcc52) is added as the default, with self-hosted Space Grotesk and DM Mono and `src/looks/acid.css`. The Look dropdown lists Acid Night, Cyc Wall, Downlight. The 8 retired looks, their fonts, the unused font files, and `src/assets/looks/macro/` are deleted (all recoverable from 0bc8bbb).
- **Scroll engine:** Lenis runs at lerp 0.05 and wheel 0.8. `scrubSeconds` is 1.2 on the stage and `sectionScrubSeconds` is 0.6 after it. `pages.handoffScreens` is 1, and there is a new `flow` group. Reduced motion uses native scroll. The adapter adds `getVelocity`, `stop`, `start` and `setFeel`.
- **Choreography:** `src/motion/flowMotion.js` covers the handoff, the Projects run with `--lift`, the Contact reveal, title entrances, row settles and the Acid palette morph. `createNavSections` drives `data-nav-section` and `<meta name="theme-color">`.
- **Extras:**
  - velocity skew (`src/motion/velocitySkew.js`, ±4°)
  - cue-ball cursor (`src/components/CursorBall.jsx`)
  - preloader (`src/components/Preloader.jsx`), which waits on each draft's new `controller.ready`
  - `?tune` panel (`src/components/TunePanel.jsx`, a lazy 1.6 kB chunk, backed by `src/motion/runtimeTuning.js`)
- **Projects:** a sticky, pinned horizontal run of the 4 clients plus "Your brand, next" (opens Contact) and "More on Instagram" (links to the real profile). Keyboard focus glides the run to the focused board.
- **Docs and tests:**
  - Docs: DESIGN.md (Acid Night primary, shared Motion, alternates), PRODUCT.md, CONTEXT.md (Look, Handoff, Run), DOCS/GSAP.md (flow section), and the surface brief.
  - Unit tests: `flowMath` and `runtimeTuning`, plus updates to the timing, schedule and look-registry tests.
  - Browser tests: new cases in `localhost-smoke.spec.js`, and `flow-smoothness.spec.js`.

### Deviations, decided while building
1. **Title entrances:** Projects and Contact titles enter with each look's own Studio letter entrance. In Acid Night that is the 91fcc52 line unmask; Cyc keeps its unclipped cast shadows.
2. **Morph windows:** the palette morph happens inside windows (`easeThemeMorph`). Ink → paper finishes by mid-handoff and paper → acid runs through the middle of the reveal, so the grey midpoint only flashes past.
3. **Palette target:** `--theme-t` is set on the two walls, its only consumers, not on whole sections (performance).
4. **Lift shadows:** a lifted board's deeper shadow is a pre-drawn pseudo-element faded by `--lift` on its own layer. The alternative, an animated `box-shadow`, repaints on every frame.
5. **Bug found in verification and fixed:** Lenis measured the page before the run added its length. With autoResize off it never re-measured, so the wheel and the header links stopped short of Contact. Lenis now re-measures after every ScrollTrigger refresh (`storyNavigationBrowser.js`).
6. **Phone rail:** on phones the Projects rail sits higher, clear of the stacked Draft and Look switchers.

### Gates
- `npm test`: 89/89 pass. `npm run build` is clean apart from the known Three.js chunk warning. `git diff --check` is clean.
- **Browser sweep** (playwright-core, headless Chromium): all 3 looks at 1440×900 and 390×844, at intro, Studio, handoff, run, reveal and Contact. It confirmed:
  - `--theme-t` reads 0 / 1 / 1 / 1.65 / 2 at Studio, handoff, run, reveal and Contact
  - the track slides the full run
  - `data-nav-section` and theme-color follow the header
  - there are no page errors apart from headless WebGL context failures
- **Behaviour checks:**
  - preloader: shows once per session
  - cursor: labels over links, and hands back to the system pointer over the controls
  - keyboard: focus glides the run
  - reduced motion: no Lenis, wrapped grid, static palettes
  - `?tune`: panel appears only on tune URLs and changes the feel live
- **Frame pace** (wheel through the whole page, Apple M4 GPU via Metal): untouched main drops 0–2.8% of frames over 20 ms; this build drops 0–1.7% (0–0.6% over the handoff, run and reveal). Under SwiftShader both builds drop far more (main 7–10%) because software compositing dominates, so that renderer is not a valid gate.
- **Not run:** `npx playwright test`. The @playwright/test 1.45.3 runner hangs at startup on this machine's Node 26.8.1, even `--list` on a one-line spec with an empty config. The new specs were exercised through equivalent playwright-core scripts instead. Real touch devices (iOS Safari, Android Chrome) were not tested.
- **Not regenerated:** `.impeccable/design.json`, the DESIGN.md sidecar.
