# GSAP and Scroll Physics Reference

This project uses Lenis for weighted scrolling and GSAP ScrollTrigger for realtime animation scrubbing. Story navigation owns page intent and transition locking; the browser adapter owns Lenis and ScrollTrigger wiring. The section choreography after the pinned stage lives in `src/motion/` (see **Flow choreography** below).

## Runtime flow

```text
wheel / touch input
  -> Story navigation decides: free scroll, the one-scroll Intro, or a Page glide
  -> Lenis applies input weight and easing
  -> GSAP ticker calls lenis.raf()
  -> Lenis emits scroll
  -> ScrollTrigger.update()
  -> scrubbed GSAP timeline updates
```

The deep Story navigation module is `src/storyNavigation.js`. `src/storyNavigationBrowser.js` is its browser adapter, and `src/hooks/useStoryPager.js` is the thin React adapter. `src/storySchedule.js` supplies Page IDs and resolved targets. `src/App.jsx` renders the visual Story and asks navigation to move to `intro`, `studio`, `projects`, or `contact`.

## Lenis options

Configured in `new Lenis({ ... })` (`src/storyNavigationBrowser.js`), with `glide` and `wheel` from `STORY_SETTINGS` (live overrides from the `?tune` panel via `src/motion/runtimeTuning.js`).
The feel follows hugeinc.com: Lenis near its defaults (lerp 0.08) and a short scrub, so there is one smoothing layer and the animations track the hand closely.
Lenis is created only when the visitor has not asked for reduced motion; with `prefers-reduced-motion: reduce` the adapter's native path scrolls the page (as hugeinc.com does).

| Attribute | Current value | Purpose |
| --- | ---: | --- |
| `lerp` | `glide` (0.08) | Each 60fps frame closes 8% of the remaining distance: a short, weighted coast after input. |
| `wheelMultiplier` | `wheel` (0.4) | Scales wheel input: one tick travels 0.4x its raw delta. |
| `syncTouch` | `false` | Touch keeps native momentum, as the reference site does, so Lenis's touch options are left unset. |
| `duration` / `easing` | unset | Deliberately unused: in Lenis they override `lerp` and turn every flick into a fixed-length glide. |
| `infinite` | `false` | Prevents the page from looping after the scroll limit. |
| `gestureOrientation` | `'vertical'` | Limits gesture processing to vertical scrolling. |
| `virtualScroll` | Story navigation handler | Lets the Story module run the one-scroll Intro and hold input during a Page glide. |
| `autoRaf` | `false` | Disables Lenis's internal animation frame because GSAP owns the frame loop. |
| `autoResize` | `false` | Story navigation debounces resize and the browser adapter calls `lenis.resize()` before restoring normalized progress. |

### Settings

All motion settings are the seven dials in `STORY_SETTINGS` (`src/storyTiming.js`), one per kind of feel, each a slider in the `?tune` panel:

| Setting | Default | What it sets |
| --- | ---: | --- |
| `glide` | `0.08` | Lenis `lerp`: how much the page coasts after a scroll (1 = no coast). |
| `wheel` | `0.4` | Lenis `wheelMultiplier`: distance per wheel tick. |
| `weight` | `0.4` | GSAP `scrub` seconds on the Intro and Studio; Projects and Contact use half. |
| `introSeconds` | `3` | The one-scroll Intro glide to Studio. |
| `depth` | `0.3` | Scales every handoff and reveal amount (rise, shrink, dim, Contact offset and shade, Studio drift and push-in); 0 is flat. |
| `speedLimit` | `0.6` | Wheel and trackpad speed limit: the most screens the scroll target may run ahead of the page (`src/scrollLead.js`, applied in the Lenis `virtualScroll` hook). Lower = heavier; 0 = off. Touch keeps native momentum. |
| `skew` | `1.5` | Most degrees the Projects cards lean at speed. |

Notes:
- Raise `glide` for a more immediate response (1 = no coast); lower it for a heavier settle. `wheel` changes distance per tick, not animation speed.
- Lenis `duration` is in seconds; a GSAP tween `duration` inside a scrubbed timeline is timeline units, mapped to scroll distance by ScrollTrigger.
- There is no `acceleration` option in Lenis, GSAP or ScrollTrigger here: the feel is `wheel` × `glide` × `weight`.
- Try values live: open the site with `?tune`, drag the sliders, then "Copy values" into `STORY_SETTINGS`.

The stage's fixed choreography (break phases, Studio cue, hold, handoff) lives in `src/storyStage.js`; small fixed values sit as constants next to the code that uses them (Intro beats in `App.jsx`, glide times and gesture thresholds in `useStoryPager.js`, skew gain in `velocitySkew.js`, cursor lag, preloader times).

### Scrolling

Wheel and touch scroll the page freely through Lenis. Header links and the Page keys (PageUp, PageDown, Home, End) glide to a Page on a quart ease-out (0.7 s plus 0.14 s per screen travelled, at most 1.5 s); Top, the wordmark and Home return to the Intro as a cut (the night fades up, the page jumps, it fades away), never a rewind through the break; the arrows and Space scroll natively, so the Projects run is never skipped, and Space on a focused button presses it. A glide never takes the page away: input along it is swallowed, but input against it (past the 14 px gesture threshold) takes the page back. Outside the break the glide stops where it is (`cancelGlide` in `src/storyNavigationBrowser.js`) and the page scrolls freely from there.

On phones three rules keep glides steady. A resize that only moves the browser chrome (the address bar sliding, same width, height change of 180 px or less on a touch screen; `src/viewportResize.js`) only re-measures the Lenis limit (`syncLimits`): no ScrollTrigger refresh, no position restore, no Story re-measure, because the layout is sized in `svh`. While a glide runs, `html.lenis.lenis-locked` takes `overflow: hidden` on touch screens, which ends any native momentum so it cannot fight the glide. A touch that pulls past the top or the bottom of the Story is held still, so the page never rubber-bands.

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

A known side effect: the page indicator and the nav "current" state follow raw scroll, so they can lead the visuals by up to the `weight` scrub (0.4 s).

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

`goToPage()` resolves a Page ID through the Story schedule and sends its normalized target to the browser adapter. The header links, the Page keys and the Contact board use that same interface. Top, the wordmark and Home are the exception: `replay()` in `src/App.jsx` fades `.cut-cover` up, calls `goToPage( 'intro', { immediate: true } )`, and fades it away.

```js
goToPage( 'projects' )
goToPage( 'contact' )
goToPage( 'intro' )
```

- Page IDs are the public interface; numeric indices stay inside Story navigation.
- A Story gesture can start at most one Page glide. Input along a glide is swallowed until the adapter completes (or the watchdog releases the lock); input against it takes the page back (see **Scrolling**).
- `window.__storyNavigationBenchmark` exists only on `?benchmark=...` URLs for deterministic browser sampling. There is no production `window.lenis` global.

## Flow choreography (after the pinned stage)

Built by `createFlowMotion()` in `src/motion/flowMotion.js`, inside the Story's `gsap.context` / `matchMedia` in `src/App.jsx`, so a look switch or a `?tune` weight or depth change reverts and rebuilds it. Shared by every look; its amounts are `FLOW_AT_DEPTH_1` scaled by `depth`. Pure arithmetic is in `src/motion/flowMath.js` (unit-tested).

| Part | Trigger (scrub `weight / 2`) | What moves |
| --- | --- | --- |
| Studio → Projects handoff | `#projects` `top bottom` → `top top` | Projects is pulled up by `pages.handoffScreens` (1 screen) and rises over the held Studio; its content rises `riseVh`. Studio shrinks to `shrinkScale`, lifts `shrinkLiftPercent`, and dims to `shrinkDim` (`.stage-shade`); `.stage-backdrop` fills the stage behind it. |
| Projects run | `#projects` `top top` → `+= run distance` | `.projects-sticky` stays put (CSS sticky) while `.projects-track` slides left by track width minus rail width, measured on every `refreshInit` into `--run-distance`. Boards get `--lift` (0 to 1) as they cross the centre (`containerAnimation`); the title drifts and the wall pushes in. |
| Projects → Contact reveal | `#contact` `top bottom` → `top top` | `.contact-inner` settles from `-contactRevealOffsetPercent` to 0 and `.contact-shade` lifts, so Contact seems to lie under Projects. The shade is a static mask (a band under Projects' bottom edge, 40% at depth 1, gone a third of the way down); only its opacity animates. Rows fade in (opacity only, so links stay focusable). |
| Titles | per section | Each look's own Studio letter entrance, scrubbed. |
| Closing shot | `#contact` `top 70%` → `top 2%` | The 8-ball (`.contact-pocket-ball`) rolls in (`xPercent` −520 → 0, `rotation` −540 → 0) and drops into the pocket (`scale` 0.64, darkened). The CSS rest state is the last frame, so reduced motion shows it too. |
| Header section | `createNavSections()`, header line `top+=64` | `data-nav-section` on `.experience` (stage, projects, contact) drives the header ink and `<meta name="theme-color">`. Runs with reduced motion too. |

Velocity skew (`src/motion/velocitySkew.js`): only the `.skew-layer-x` Projects track leans `skewX` with Lenis velocity (fixed gain 0.35, clamped to `skew`, eased over 0.4 s). Titles, Contact, the pinned stage and the fixed chrome never lean, and nothing leans during a Story navigation glide.

Keyboard focus on a board link glides the run until that board sits at the centre (`getRunScrollTarget`).
