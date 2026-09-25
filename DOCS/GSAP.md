# GSAP and Scroll Physics Reference

This project uses Lenis for weighted scrolling and GSAP ScrollTrigger for realtime animation scrubbing. Story navigation owns page intent and transition locking; the browser adapter owns Lenis and ScrollTrigger wiring. The section choreography after the pinned stage lives in `src/motion/` (see **Flow choreography** below).

## Runtime flow

```text
wheel / touch input
  -> Story navigation qualifies one-page intent
  -> Lenis applies input weight and easing
  -> GSAP ticker calls lenis.raf()
  -> Lenis emits scroll
  -> ScrollTrigger.update()
  -> scrubbed GSAP timeline updates
```

The deep Story navigation module is `src/storyNavigation.js`. `src/storyNavigationBrowser.js` is its browser adapter, and `src/hooks/useStoryPager.js` is the thin React adapter. `src/storySchedule.js` supplies Page IDs and resolved targets. `src/App.jsx` renders the visual Story and asks navigation to move to `intro`, `studio`, `projects`, or `contact`.

## Lenis options

Configured in `new Lenis({ ... })` (`src/storyNavigationBrowser.js`), with values from `STORY_TIMING.scroll` (live overrides from the `?tune` panel via `src/motion/runtimeTuning.js`).
The feel is a heavy, cinematic glide, chosen 2026-09-25: heavier than rockstargames.com/VI (lerp 0.07, wheel 1.2) and far heavier than hugeinc.com, which runs Lenis at its defaults (lerp 0.1, wheel 1) and gets its weight from choreography instead.
Lenis is created only when the visitor has not asked for reduced motion; with `prefers-reduced-motion: reduce` the adapter's native path scrolls the page (as hugeinc.com does).

| Attribute | Current value | Purpose |
| --- | ---: | --- |
| `lerp` | `0.05` | Each 60fps frame closes 5% of the remaining distance, so the page keeps coasting after input. |
| `wheelMultiplier` | `0.8` | Scales wheel input: one tick travels 0.8x its raw delta. |
| `syncTouch` | `!freeScroll` | Free scroll leaves touch to native momentum (as the reference site does); paged mode needs Lenis-owned touch for its gesture lock. |
| `touchMultiplier` | `1` | Swipe distance scale (Lenis-owned touch only). |
| `syncTouchLerp` | `0.075` | Touch glide after release (Lenis-owned touch only). |
| `touchInertiaExponent` | `1.7` | How strongly a touch flick carries on (Lenis-owned touch only). |
| `duration` / `easing` | unset | Deliberately unused: in Lenis they override `lerp` and turn every flick into a fixed-length glide. |
| `infinite` | `false` | Prevents the page from looping after the scroll limit. |
| `gestureOrientation` | `'vertical'` | Limits gesture processing to vertical scrolling. |
| `virtualScroll` | Story navigation handler | Lets the Story module qualify wheel and touch intent, lock transitions, and advance at most one Page. |
| `autoRaf` | `false` | Disables Lenis's internal animation frame because GSAP owns the frame loop. |
| `autoResize` | `false` | Story navigation debounces resize and the browser adapter calls `lenis.resize()` before restoring normalized progress. |

### Free scroll (default)

`STORY_TIMING.navigation.freeScroll` is `true`: wheel and touch pass straight through to Lenis, so the whole Story scrolls continuously and the GSAP timeline scrubs with it. Stable Page and the page indicator follow the scroll position. Page marks, header links, and arrow/Page keys still glide to a Page target, and input is locked only during that glide. Set it to `false` to restore the one-Page-per-gesture behaviour below.

### Story gesture qualification (when `freeScroll` is `false`)

`src/storyNavigation.js` accumulates wheel deltas until the shared `gestureThresholdPx` (`14`) is reached, then advances one Page and locks further input until settlement. Wheel direction changes reset the accumulation after `gestureResetMs` (`120` ms) of idle time. Touch uses the same threshold from finger-coordinate deltas, while keyboard input maps directly to Page IDs.

The browser adapter passes qualified input into Lenis through `virtualScroll`. This keeps the native Lenis fallback usable while keeping Story rules deterministic in the in-memory test adapter.

## ScrollTrigger options

Used in the story timeline and reduced-motion trigger.

| Attribute | Current value | Purpose |
| --- | ---: | --- |
| `trigger` | `storyRef.current` | Element whose scroll range controls the animation. |
| `start` | `'top top'` | Starts when the story top reaches the viewport top. |
| `end` | `'bottom bottom'` | Ends when the story bottom reaches the viewport bottom. |
| `scrub` | `1.2` (`STORY_TIMING.scroll.scrubSeconds`) | The playhead takes 1.2 s to catch up with the Lenis-smoothed scroll, which gives the Intro break extra weight. The section choreography uses `sectionScrubSeconds` (`0.6`) instead. |
| `invalidateOnRefresh` | `true` | Recalculates function-based values after resize or refresh. Important for mobile dimensions. |
| timeline `onUpdate` | callback | Drives the 3D draft, the Draft 2 handoff, and ball-layer promotion from the *timeline's* lagged progress, so they stay in step with the DOM tweens. Stable Page state still comes from raw scroll via Story navigation. |
| `onRefresh` | callback | Reapplies visual state after ScrollTrigger recalculates its range. Navigation separately retains normalized progress on resize. |

### `scrub` behavior

```js
scrub: STORY_TIMING.scroll.scrubSeconds // 1.2
```

- A number: the playhead eases toward the scroll position over that many seconds (the extra weight).
- `true`: the animation follows the scroll playhead directly.
- `false` or omitted: the animation plays independently of scroll.

This project uses a numeric scrub (1.2 s on the pinned stage, 0.6 s after it) on top of the Lenis glide. The shorter section scrub keeps text being read from swimming after the scroll stops. Two rules keep that lag coherent:

1. **One clock for visuals.** Everything visual reads the scrubbed timeline's progress: DOM tweens, the 3D intro draft, and the Draft 2 handoff. Raw scroll progress is only remembered, for Draft/Look switch restores.
2. **Jumps don't replay.** After a Draft/Look switch seeks the Story, `finishScrubCatchUp()` completes the scrub tween at once.

A known side effect: the page indicator and the nav "current" state follow raw scroll, so they can lead the visuals by up to 1.2 s.

## GSAP timeline attributes

Used by `gsap.timeline().to(...)` and `gsap.set(...)`.

| Attribute | Purpose |
| --- | --- |
| `duration` | Length of a tween in timeline units. It is not automatically a CSS milliseconds value. |
| `delay` | Waits before a tween starts. Avoid for scroll-scrubbed scenes unless the delay is intentional. |
| `ease` | Shapes a tween's local motion curve. Scroll-scrubbed movement usually works best with the default linear relationship. |
| `stagger` | Offsets child animations, such as title letters or contact items. |
| `position` | Places a tween at an exact timeline point. This project uses numeric positions to lock scene beats to scroll. |
| `x`, `y` | Pixel or unit translation. |
| `xPercent`, `yPercent` | Percentage translation based on the target's own size. Useful for centering. |
| `scale`, `scaleX`, `scaleY` | Uniform or axis-specific scaling. |
| `rotation`, `rotationX` | 2D or 3D rotation in degrees. |
| `opacity` | CSS opacity from `0` to `1`. |
| `autoAlpha` | GSAP helper that changes opacity and toggles `visibility`. |
| `force3D` | Encourages GPU-backed transforms when supported. |
| `boxShadow` | Animatable CSS shadow value. Used for the target pocket hit. |

### Timeline methods

| Method | Purpose |
| --- | --- |
| `gsap.timeline(options)` | Creates an ordered animation timeline. |
| `.to(target, vars, position)` | Animates target properties toward new values. |
| `.set(target, vars)` | Applies properties immediately at a timeline point. |
| `.addLabel(name, position)` | Names a timeline position for readable scene phases. |
| `.context(callback, scope)` | Groups GSAP work so React cleanup can revert it. |
| `gsap.matchMedia()` | Creates desktop/mobile media-query animation branches. |
| `gsap.set()` | Sets initial or reduced-motion state without interpolation. |

## Cursor and frame-loop attributes

| API / attribute | Current value | Purpose |
| --- | ---: | --- |
| `gsap.quickTo()` | key light `0.9`, cue-ball cursor `0.18` (`STORY_TIMING.flow.cursorLagSeconds`), skew `0.4` | Reusable followers for the key light, the cursor ball, and the velocity lean, without a new tween per event. |
| `quickTo` `ease` | `'power3.out'` | A soft follow-through for all three. |
| `gsap.ticker.add()` | `driveLenis` in `storyNavigationBrowser.js` | Runs Lenis from the GSAP frame loop while the browser adapter is mounted. |
| `gsap.ticker.remove()` | adapter cleanup callback | Stops the Lenis driver when Story navigation is destroyed. |
| `gsap.ticker.lagSmoothing(0)` | `0` | Prevents GSAP from hiding delayed frames and causing scroll jumps. |
| `ScrollTrigger.update()` | scroll callback | Makes ScrollTrigger read the latest Lenis position immediately. |
| `ScrollTrigger.refresh()` | resize callback | Rebuilds trigger measurements after layout changes. |
| `ScrollTrigger.scrollerProxy()` | `document.body` in the browser adapter | Connects ScrollTrigger's scroll reads and writes to Lenis without publishing a production global. |

## Header navigation

`goToPage()` resolves a Page ID through the Story schedule and sends its normalized target to the browser adapter. Header controls and page dots use that same interface, so `Projects`, `Contact`, and `Top` keep identical transition locking and easing.

```js
goToPage( 'projects' )
goToPage( 'contact' )
goToPage( 'intro' )
```

- Page IDs are the public interface; numeric indices stay inside Story navigation.
- A Story gesture can start at most one Page transition; incoming gestures are ignored until the adapter completes or the watchdog releases the lock.
- `window.__storyNavigationBenchmark` exists only on `?benchmark=...` URLs for deterministic browser sampling. There is no production `window.lenis` global.

## Scroll weight tuning

There is no active `acceleration` option in this project. Scroll acceleration is the combined result of input scale, interpolation duration, and easing.

| Desired result | Change |
| --- | --- |
| Less distance per wheel tick | Lower `wheelMultiplier`. |
| More follow-through / heavier settle | Increase Lenis `duration`, or lower `lerp` if switching to interpolation mode. |
| More immediate response | Lower Lenis `duration`, or raise `lerp`. |
| More animation catch-up delay | Use numeric `scrub`, but this adds another smoothing layer. |
| Preserve direct scroll intent | Keep `scrub: true`. |
| Try values live | Open the site with `?tune`, drag the sliders, then "Copy values" into `STORY_TIMING_DEFAULTS`. |

## Important distinction

- Lenis `duration` is measured in seconds.
- GSAP tween `duration` is measured in timeline units and is mapped to scroll distance by ScrollTrigger.
- `wheelMultiplier` changes input distance; it does not change animation speed directly.
- `acceleration` is not a configured GSAP, ScrollTrigger, or Lenis property here.

## Flow choreography (after the pinned stage)

Built by `createFlowMotion()` in `src/motion/flowMotion.js`, inside the Story's `gsap.context` / `matchMedia` in `src/App.jsx`, so a look switch or a `?tune` scrub change reverts and rebuilds it. Shared by every look; values live in `STORY_TIMING.flow`. Pure arithmetic is in `src/motion/flowMath.js` (unit-tested).

| Part | Trigger (scrub `sectionScrubSeconds`) | What moves |
| --- | --- | --- |
| Studio → Projects handoff | `#projects` `top bottom` → `top top` | Projects is pulled up by `pages.handoffScreens` (1 screen) and rises over the held Studio; its content rises `riseVh`. Studio shrinks to `shrinkScale`, lifts `shrinkLiftPercent`, and dims to `shrinkDim` (`.stage-shade`); `.stage-backdrop` fills the stage behind it. |
| Projects run | `#projects` `top top` → `+= run distance` | `.projects-sticky` stays put (CSS sticky) while `.projects-track` slides left by track width minus rail width, measured on every `refreshInit` into `--run-distance`. Boards get `--lift` (0 to 1) as they cross the centre (`containerAnimation`); the title drifts and the wall pushes in. |
| Projects → Contact reveal | `#contact` `top bottom` → `top top` | `.contact-inner` settles from `-contactRevealOffsetPercent` to 0 and `.contact-shade` lifts, so Contact seems to lie under Projects. Rows fade in (opacity only, so links stay focusable). |
| Titles | per section | Each look's own Studio letter entrance, scrubbed. |
| Section themes | `#projects` `top bottom` → `#contact` `top top` | Looks with `sectionThemes` (Acid Night) get one palette position `--theme-t` (0 ink, 1 paper, 2 acid), held at 1 through the run; `easeThemeMorph` keeps each change short. |
| Header section | `createNavSections()`, header line `top+=64` | `data-nav-section` on `.experience` (stage, projects, contact) drives the header ink and `<meta name="theme-color">`. Runs with reduced motion too. |

Velocity skew (`src/motion/velocitySkew.js`): every `.skew-layer` leans `skewY` and the `.skew-layer-x` track leans `skewX` with Lenis velocity (`skewGain`, clamped to `skewMaxDeg`, eased over `skewSettleSeconds`). The pinned stage and the fixed chrome never skew.

Keyboard focus on a board link glides the run until that board sits at the centre (`getRunScrollTarget`).
