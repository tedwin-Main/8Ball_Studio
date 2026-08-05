# GSAP and Scroll Physics Reference

This project uses Lenis for weighted scrolling and GSAP ScrollTrigger for realtime animation scrubbing.

## Runtime flow

```text
wheel / touch input
  -> Lenis applies input weight and easing
  -> GSAP ticker calls lenis.raf()
  -> Lenis emits scroll
  -> ScrollTrigger.update()
  -> scrubbed GSAP timeline updates
```

The main implementation is in `src/App.jsx`. The header uses Lenis for weighted navigation to the Projects and Contact timeline positions. The Top control scrolls to document position `0`; there is no pagination controller.

## Lenis options

Configured in `new Lenis({ ... })`.

| Attribute | Current value | Purpose |
| --- | ---: | --- |
| `wheelMultiplier` | `0.85` | Scales wheel input for natural travel distance before smoothing applies. |
| `lerp` | `0.07` | Linear interpolation factor per frame. Provides physical inertia and a heavy glide deceleration tail. |
| `infinite` | `false` | Prevents the page from looping after the scroll limit. |
| `gestureOrientation` | `'vertical'` | Limits gesture processing to vertical scrolling. |
| `virtualScroll` | `limitWheelGesture` | Caps one wheel event and one short wheel gesture before Lenis adds input to its target scroll. Touch events pass through unchanged. |
| `autoRaf` | `false` | Disables Lenis's internal animation frame because GSAP owns the frame loop. |
| `autoResize` | `true` | Lets Lenis refresh its scroll limits when layout size changes. |

### Wheel gesture limiter

```js
const MAX_WHEEL_EVENT_DELTA_PX = 80
const MAX_WHEEL_GESTURE_VIEWPORTS = 0.9
const WHEEL_GESTURE_RESET_DELAY_MS = 140
```

- `MAX_WHEEL_EVENT_DELTA_PX` limits one unusually large mouse-wheel or trackpad event.
- `MAX_WHEEL_GESTURE_VIEWPORTS` limits the accumulated distance from one continuous wheel burst to `0.9` viewport heights.
- `WHEEL_GESTURE_RESET_DELAY_MS` starts a fresh gesture after the wheel goes quiet.
- Direction changes also start a fresh gesture, so reversing scroll stays responsive.
- Touch events are not modified. This keeps mobile scrolling natural.
- When the budget is full, the callback prevents the original wheel event so native scrolling cannot bypass Lenis.

This is an input-distance guard, not pagination. Scroll remains continuous inside the allowed gesture distance.

## ScrollTrigger options

Used in the story timeline and reduced-motion trigger.

| Attribute | Current value | Purpose |
| --- | ---: | --- |
| `trigger` | `storyRef.current` | Element whose scroll range controls the animation. |
| `start` | `'top top'` | Starts when the story top reaches the viewport top. |
| `end` | `'bottom bottom'` | Ends when the story bottom reaches the viewport bottom. |
| `scrub` | `1.2` | Maps scroll position to GSAP playhead with 1.2s momentum catch-up elasticity for Behance agency feel. |
| `invalidateOnRefresh` | `true` | Recalculates function-based values after resize or refresh. Important for mobile dimensions. |
| `onUpdate` | callback | Updates the active page and layer promotion on every scrub update. |
| `onRefresh` | callback | Reapplies page state after ScrollTrigger recalculates its range. |

### `scrub` behavior

```js
scrub: 1.2
```

- `true`: animation follows scroll directly.
- `false` or omitted: animation plays independently of scroll.
- `1.2`: animation catches up over `1.2` seconds with fluid momentum.

This project uses `scrub: 1.2` to give animations physical mass and inertia as the user scrolls.

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
| `gsap.ticker.add()` | `driveLenis` | Runs Lenis from the GSAP frame loop. |
| `gsap.ticker.remove()` | cleanup callback | Stops the Lenis driver when React unmounts. |
| `gsap.ticker.lagSmoothing(0)` | `0` | Prevents GSAP from hiding delayed frames and causing scroll jumps. |
| `ScrollTrigger.update()` | scroll callback | Makes ScrollTrigger read the latest Lenis position immediately. |
| `ScrollTrigger.refresh()` | resize callback | Rebuilds trigger measurements after layout changes. |
| `ScrollTrigger.scrollerProxy()` | `document.body` | Connects ScrollTrigger's scroll reads and writes to Lenis. |

## Header navigation

`scrollToStoryUnit()` converts a GSAP timeline unit into document scroll distance. It sends that target to the same Lenis instance used by wheel input, so `Our Projects`, `Contact Us`, and `Top` keep the same weighted motion.

```js
const target = storyTop + storyScrollDistance * ( timelineUnit / STORY_TIMELINE_UNITS )
window.lenis.scrollTo( target )
```

- Projects targets `STUDIO_END_UNITS` (`3` of `4`).
- Contact targets `PROJECTS_END_UNITS` (`4` of `4`).
- No page snap state or pagination controller is needed.

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
