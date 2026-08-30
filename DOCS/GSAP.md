# GSAP and Scroll Physics Reference

This project uses Lenis for weighted scrolling and GSAP ScrollTrigger for realtime animation scrubbing. Story navigation owns page intent and transition locking; the browser adapter owns Lenis and ScrollTrigger wiring.

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

Configured in `new Lenis({ ... })`.

| Attribute | Current value | Purpose |
| --- | ---: | --- |
| `wheelMultiplier` | `0.4` | Scales wheel input before Story gesture qualification and smoothing apply. |
| `lerp` | `0.085` | Linear interpolation factor per frame. Provides weighted but responsive glide. |
| `infinite` | `false` | Prevents the page from looping after the scroll limit. |
| `gestureOrientation` | `'vertical'` | Limits gesture processing to vertical scrolling. |
| `virtualScroll` | Story navigation handler | Lets the Story module qualify wheel and touch intent, lock transitions, and advance at most one Page. |
| `autoRaf` | `false` | Disables Lenis's internal animation frame because GSAP owns the frame loop. |
| `autoResize` | `false` | Story navigation debounces resize and the browser adapter calls `lenis.resize()` before restoring normalized progress. |

### Story gesture qualification

`src/storyNavigation.js` accumulates wheel deltas until the shared `gestureThresholdPx` (`14`) is reached, then advances one Page and locks further input until settlement. Wheel direction changes reset the accumulation after `gestureResetMs` (`120` ms) of idle time. Touch uses the same threshold from finger-coordinate deltas, while keyboard input maps directly to Page IDs.

The browser adapter passes qualified input into Lenis through `virtualScroll`. This keeps the native Lenis fallback usable while keeping Story rules deterministic in the in-memory test adapter.

## ScrollTrigger options

Used in the story timeline and reduced-motion trigger.

| Attribute | Current value | Purpose |
| --- | ---: | --- |
| `trigger` | `storyRef.current` | Element whose scroll range controls the animation. |
| `start` | `'top top'` | Starts when the story top reaches the viewport top. |
| `end` | `'bottom bottom'` | Ends when the story bottom reaches the viewport bottom. |
| `scrub` | `true` | Maps scroll position directly to the GSAP playhead; Lenis remains the only scroll smoothing layer. |
| `invalidateOnRefresh` | `true` | Recalculates function-based values after resize or refresh. Important for mobile dimensions. |
| `onUpdate` | callback | Updates Draft visual state on every scrub update. Stable Page state comes from Story navigation. |
| `onRefresh` | callback | Reapplies visual state after ScrollTrigger recalculates its range. Navigation separately retains normalized progress on resize. |

### `scrub` behavior

```js
scrub: true
```

- `true`: animation follows the normalized scroll playhead directly.
- `false` or omitted: animation plays independently of scroll.

This project uses `scrub: true` so the visual timeline does not add a second catch-up delay on top of Lenis and Story transition easing.

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
| `gsap.quickTo()` | `duration: 0.05–0.14` | Creates reusable setters for cursor position without creating a new tween for every pointer event. |
| `quickTo` `ease` | `'power2.out'` for glow | Gives the pointer glow a soft follow-through. |
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
| Keep marquee speed unchanged | Do not change `.projects-track` `animation-duration` in `src/styles.css`. |

## Important distinction

- Lenis `duration` is measured in seconds.
- GSAP tween `duration` is measured in timeline units and is mapped to scroll distance by ScrollTrigger.
- CSS `animation-duration` controls the Projects marquee and is independent of Lenis and GSAP.
- `wheelMultiplier` changes input distance; it does not change animation speed directly.
- `acceleration` is not a configured GSAP, ScrollTrigger, or Lenis property here.
