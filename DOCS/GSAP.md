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

Configured in `new Lenis({ ... })` (`src/storyNavigationBrowser.js`), with `glide` and `wheel` from `STORY_SETTINGS` (live overrides from the `?tune` panel via `src/motion/runtimeTuning.js`).
The feel follows hugeinc.com: Lenis near its defaults (lerp 0.1) and a short scrub, so there is one smoothing layer and the animations track the hand closely.
Lenis is created only when the visitor has not asked for reduced motion; with `prefers-reduced-motion: reduce` the adapter's native path scrolls the page (as hugeinc.com does).

| Attribute | Current value | Purpose |
| --- | ---: | --- |
| `lerp` | `0.1` | Each 60fps frame closes 10% of the remaining distance: a short coast after input. |
| `wheelMultiplier` | `0.7` | Scales wheel input: one tick travels 0.7x its raw delta. |
| `syncTouch` | `false` | Touch keeps native momentum, as the reference site does. |
| `touchMultiplier` | `1` | Swipe distance scale (Lenis-owned touch only). |
| `syncTouchLerp` | `0.075` | Touch glide after release (Lenis-owned touch only). |
| `touchInertiaExponent` | `1.7` | How strongly a touch flick carries on (Lenis-owned touch only). |
| `duration` / `easing` | unset | Deliberately unused: in Lenis they override `lerp` and turn every flick into a fixed-length glide. |
| `infinite` | `false` | Prevents the page from looping after the scroll limit. |
| `gestureOrientation` | `'vertical'` | Limits gesture processing to vertical scrolling. |
| `virtualScroll` | Story navigation handler | Lets the Story module run the one-scroll Intro and hold input during a Page glide. |
| `autoRaf` | `false` | Disables Lenis's internal animation frame because GSAP owns the frame loop. |
| `autoResize` | `false` | Story navigation debounces resize and the browser adapter calls `lenis.resize()` before restoring normalized progress. |

### Settings

All motion settings are the six dials in `STORY_SETTINGS` (`src/storyTiming.js`), one per kind of feel, each a slider in the `?tune` panel:

| Setting | Default | What it sets |
| --- | ---: | --- |
| `glide` | `0.1` | Lenis `lerp`: how much the page coasts after a scroll (1 = no coast). |
| `wheel` | `0.7` | Lenis `wheelMultiplier`: distance per wheel tick. |
| `weight` | `0.4` | GSAP `scrub` seconds on the Intro and Studio; Projects and Contact use half. |
| `introSeconds` | `3` | The one-scroll Intro glide to Studio. |
| `depth` | `1` | Scales every handoff and reveal amount (rise, shrink, dim, Contact offset and shade, Studio drift and push-in); 0 is flat. |
| `skew` | `4` | Most degrees content leans at speed. |

The stage's fixed choreography (break phases, Studio cue, hold, handoff) lives in `src/storyStage.js`; small fixed values sit as constants next to the code that uses them (Intro beats in `App.jsx`, glide times and gesture thresholds in `useStoryPager.js`, skew gain in `velocitySkew.js`, cursor lag, preloader times).

### Scrolling

Wheel and touch scroll the page freely through Lenis. Header links and the Page keys (PageUp, PageDown, Home, End) glide to a Page (1.2 s); the arrows and Space scroll natively, so the Projects run is never skipped, and Space on a focused button presses it. A glide never takes the page away: input along it is swallowed, but input against it (past the 14 px gesture threshold) takes the page back. Outside the break the glide stops where it is (`cancelGlide` in `src/storyNavigationBrowser.js`) and the page scrolls freely from there.

The Intro is the exception: the span from Intro to Studio is an autoplay span (`autoplaySpan` in `src/storyNavigation.js`). One wheel burst, swipe, ArrowDown or Space there glides the whole break to Studio in `introSeconds` on a smooth-step ease, with the `weight` scrub trailing it, so the 8-ball starts slowly and rolls in heavy. Playing it back needs more intent: upward input at Studio must add up to 120 px (`rewindThresholdPx`; separate gestures add up while each follows the last within 800 ms), so trackpad drift or one stray notch never rewinds; then the break plays back in 1 s. Input against either glide turns it around to the other end, taking the matching share of its time, so the break is never left half-played. A flick or key step up from further down that would carry into the break stops on Studio. The rest of a gesture that started a glide is swallowed.

## ScrollTrigger options

Used in the story timeline and reduced-motion trigger.

| Attribute | Current value | Purpose |
| --- | ---: | --- |
| `trigger` | `storyRef.current` | Element whose scroll range controls the animation. |
| `start` | `'top top'` | Starts when the story top reaches the viewport top. |
| `end` | `'bottom bottom'` | Ends when the story bottom reaches the viewport bottom. |
| `scrub` | `0.4` (`weight`) | The playhead takes 0.4 s to catch up with the Lenis-smoothed scroll. The section choreography uses half (`0.2`). |
| `invalidateOnRefresh` | `true` | Recalculates function-based values after resize or refresh. Important for mobile dimensions. |
| timeline `onUpdate` | callback | Drives the 3D draft, the Draft 2 handoff, and ball-layer promotion from the *timeline's* lagged progress, so they stay in step with the DOM tweens. Stable Page state still comes from raw scroll via Story navigation. |
| `onRefresh` | callback | Reapplies visual state after ScrollTrigger recalculates its range. Navigation separately retains normalized progress on resize. |

### `scrub` behavior

```js
scrub: tuning.weight // 0.4
```

- A number: the playhead eases toward the scroll position over that many seconds (the extra weight).
- `true`: the animation follows the scroll playhead directly.
- `false` or omitted: the animation plays independently of scroll.

This project uses a numeric scrub (0.4 s on the pinned stage, 0.2 s after it) on top of the Lenis glide. The shorter section scrub keeps text being read from swimming after the scroll stops. Two rules keep that lag coherent:

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
| `gsap.quickTo()` | key light `0.9`, cue-ball cursor `0.18`, skew `0.4` | Reusable followers for the key light, the cursor ball, and the velocity lean, without a new tween per event. |
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
| Less distance per wheel tick | Lower `wheel`. |
| More coast / heavier settle | Lower `glide`. |
| More immediate response | Raise `glide` (1 = no coast). |
| More animation catch-up delay | Raise `weight`. |
| Calmer or bolder page changes | Lower or raise `depth`. |
| Try values live | Open the site with `?tune`, drag the sliders, then "Copy values" into `STORY_SETTINGS`. |

## Important distinction

- Lenis `duration` is measured in seconds.
- GSAP tween `duration` is measured in timeline units and is mapped to scroll distance by ScrollTrigger.
- `wheel` changes input distance; it does not change animation speed directly.
- `acceleration` is not a configured GSAP, ScrollTrigger, or Lenis property here.

## Flow choreography (after the pinned stage)

Built by `createFlowMotion()` in `src/motion/flowMotion.js`, inside the Story's `gsap.context` / `matchMedia` in `src/App.jsx`, so a look switch or a `?tune` weight or depth change reverts and rebuilds it. Shared by every look; its amounts are `FLOW_AT_DEPTH_1` scaled by `depth`. Pure arithmetic is in `src/motion/flowMath.js` (unit-tested).

| Part | Trigger (scrub `weight / 2`) | What moves |
| --- | --- | --- |
| Studio → Projects handoff | `#projects` `top bottom` → `top top` | Projects is pulled up by `pages.handoffScreens` (1 screen) and rises over the held Studio; its content rises `riseVh`. Studio shrinks to `shrinkScale`, lifts `shrinkLiftPercent`, and dims to `shrinkDim` (`.stage-shade`); `.stage-backdrop` fills the stage behind it. |
| Projects run | `#projects` `top top` → `+= run distance` | `.projects-sticky` stays put (CSS sticky) while `.projects-track` slides left by track width minus rail width, measured on every `refreshInit` into `--run-distance`. Boards get `--lift` (0 to 1) as they cross the centre (`containerAnimation`); the title drifts and the wall pushes in. |
| Projects → Contact reveal | `#contact` `top bottom` → `top top` | `.contact-inner` settles from `-contactRevealOffsetPercent` to 0 and `.contact-shade` lifts, so Contact seems to lie under Projects. The shade is a static mask (a band under Projects' bottom edge, 40% at depth 1, gone a third of the way down); only its opacity animates. Rows fade in (opacity only, so links stay focusable). |
| Titles | per section | Each look's own Studio letter entrance, scrubbed. |
| Header section | `createNavSections()`, header line `top+=64` | `data-nav-section` on `.experience` (stage, projects, contact) drives the header ink and `<meta name="theme-color">`. Runs with reduced motion too. |

Velocity skew (`src/motion/velocitySkew.js`): every `.skew-layer` leans `skewY` and the `.skew-layer-x` track leans `skewX` with Lenis velocity (fixed gain 0.35, clamped to `skew`, eased over 0.4 s). The pinned stage and the fixed chrome never skew.

Keyboard focus on a board link glides the run until that board sits at the centre (`getRunScrollTarget`).
