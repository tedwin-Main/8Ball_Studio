# 8Ball Studio — Simple QA Architecture Guide

## What this website is

8Ball Studio is one long, animated story. It has five screen-sized stops:

1. Intro — close-up 8 ball and pool table.
2. Shot — table zoomed out; cue waits behind the ball.
3. Studio — cue hits ball; ball sinks; 8Ball Studio title appears.
4. Projects — work images move in an infinite marquee loop.
5. Contact — WhatsApp, Instagram, and email details.

It is one React page with animated sections, not five separate browser pages.

## Overall tech stack

This is the main stack used across the whole site:

| Layer | Technology | Plain-English job |
| --- | --- | --- |
| UI | **React 19** | Builds the page and reusable UI parts. |
| Browser entry | **ReactDOM** | Mounts React into `index.html`. |
| Local development and build | **Vite 7** | Starts the local server and creates production assets. |
| Animation | **GSAP 3.13** | Moves, scales, rotates, fades, and reveals visual elements. |
| Scroll animation link | **GSAP ScrollTrigger** | Maps document scroll progress to the GSAP story timeline. |
| Page navigation | **Custom `useStoryPager` React hook** | Converts wheel, trackpad, touch, and keyboard input into one page step. |
| Styling and responsive layout | **Plain CSS** | Draws the table, sets colors and typography, handles desktop/mobile layout. |
| Browser APIs | **`window.scrollTo`, `requestAnimationFrame`, media queries** | Moves the scroll position, keeps cursor updates light, and detects screen/input type. |
| Content assets | **Local PNG, JPG, and SVG files** | Supplies the logo and project images from `src/assets`. |

## Important files

| File | What QA needs to know |
| --- | --- |
| [`src/main.jsx`](../src/main.jsx) | Starts React and loads `App`. |
| [`src/App.jsx`](../src/App.jsx) | Defines the five stops, page text, assets, React markup, and GSAP story timing. |
| [`src/hooks/useStoryPager.js`](../src/hooks/useStoryPager.js) | Owns one-step scrolling and input locking. |
| [`src/styles.css`](../src/styles.css) | Owns colors, typography, responsive layout, sticky stage, dots, and marquee CSS. |
| [`package.json`](../package.json) | Lists libraries and `dev`, `build`, and `preview` commands. |
| [`index.html`](../index.html) | Basic browser HTML shell. |

## Page-by-page map and technology

Each page uses the same React + CSS foundation. GSAP controls the cinematic transitions. The page-specific work is:

| Page | Main content | React source | Animation / layout technology |
| --- | --- | --- | --- |
| **Intro** | Hero copy, pool table, large 8-ball logo, scroll prompt. | `App.jsx`: `PoolTable`, `EightBall`, hero markup. | GSAP timeline label `intro`; CSS `.stage`, `.pool-table`, `.hero-copy`. |
| **Shot** | Full table view, ball hold position, cue behind ball. | `App.jsx`: pool scene markup. | GSAP timeline label `shot`; cue and ball transforms; CSS table geometry. |
| **Studio** | Cue impact, ball roll/sink, impact effects, 8Ball Studio title. | `App.jsx`: `.title-screen` markup. | GSAP timeline label `studio`; ScrollTrigger follows scroll; CSS title and scene layers. |
| **Projects** | “Our Projects” heading and project image cards. | `App.jsx`: `PROJECT_ITEMS`, `.projects-screen`. | CSS `@keyframes projects-marquee` runs the infinite loop; GSAP fades the page in/out. |
| **Contact** | Contact heading and WhatsApp, Instagram, Email rows. | `App.jsx`: `CONTACT_ITEMS`, contact markup. | GSAP contact reveal; CSS responsive contact cards and SVG icons. |
| **Shared controls** | Top link and five dot pagination controls. | `App.jsx` + `useStoryPager.js`. | JavaScript page controller; CSS dot states and fixed control layout. |

## How the story runs

```text
Browser opens
  → ReactDOM mounts App
  → App renders all five screen stops
  → CSS creates the sticky visual stage and responsive layout
  → GSAP creates one timeline with five labels
  → ScrollTrigger reads scroll progress and updates that timeline
  → useStoryPager moves exactly one adjacent page per gesture
```

### Fixed stage

`.stage` uses `position: sticky`. The stage stays in view while the five `.story-page` sections provide scroll distance. The visitor sees one cinematic canvas while the timeline changes.

### Scroll controller

[`useStoryPager.js`](../src/hooks/useStoryPager.js) is the main scroll controller:

- A wheel or trackpad gesture must reach `12px` before it changes page.
- An adjacent page tween lasts `0.3s` in either direction.
- Direct pagination jumps use the `0.3s` minimum so farther targets never move slower: `1 page = 0.30s`, `2 pages = 0.30s`, `3 pages = 0.30s`, `4 pages = 0.30s`.
- Wheel inertia is released after `90ms` of quiet input.
- A fresh trackpad gesture can interrupt the current transition and retarget one adjacent page.
- Continuing momentum from the same gesture is ignored, so fast flicks cannot skip the story.
- New wheel gestures, touch, keyboard, and pagination input are not blocked while a page animation is running.
- Touch needs a `52px` swipe. Keyboard arrows, PageUp/PageDown, Space, Home, and End use the same page controller.
- At Intro and Contact, the page index is clamped so scrolling cannot leave the story range.

### GSAP and ScrollTrigger

`App.jsx` creates one GSAP timeline with four equal segments:

```js
scrub: true
```

`scrub: true` means the timeline follows the current scroll position directly. The hook supplies the `0.3s` page movement. Do not add a numeric scrub value; that would add a second catch-up delay and make scrolling feel slow.

Scrolling up uses the same timeline and the same page controller in reverse. No separate reverse animation exists.

### Projects marquee

The Projects page renders the same project list twice. CSS moves `.projects-track` from `translateX(0)` to `translateX(-50%)` with `@keyframes projects-marquee`. The duplicated list makes the loop continuous with no blank gap. GSAP only reveals and hides the Projects page; CSS owns the continuous loop.

## Responsive and accessibility rules

- GSAP uses different table, cue, and pocket positions for desktop, compact, portrait, and landscape screens.
- CSS uses `clamp()`, viewport units, and container-aware sizing so headings do not overflow when browser zoom changes.
- A fine pointer gets the cursor dot/ring. Touch devices do not run that cursor effect.
- `prefers-reduced-motion: reduce` shows stable story states and hides decorative cursor/loop motion.
- The visual pool scene is `aria-hidden`; contact links and page dots remain keyboard reachable.

## QA checks

1. Scroll forward one stop at a time: Intro → Shot → Studio → Projects → Contact.
2. Scroll backward. The same stops must appear in reverse order.
3. At Shot, cue is visible but has not hit the ball.
4. At Studio, ball is sunk and the title is readable.
5. Flick the trackpad hard. It may retarget one next page, never several pages.
6. Start a new gesture during a transition. The current tween should interrupt and move toward the new target.
7. Projects marquee loops without a blank gap or number labels.
8. Contact shows all three contact rows and the email address.
9. Click each dot. It selects the matching stop.
10. Compare Intro → Shot with Intro → Projects. The adjacent move uses full speed; the longer jump finishes faster.
11. Check desktop, mobile portrait, mobile landscape, and browser zoom.
12. Enable reduced motion. The site remains usable with stable visual states.

## Where to change common things

| Wanted change | Direct file link | Change |
| --- | --- | --- |
| Adjacent and long-jump speed | [`useStoryPager.js#L5`](../src/hooks/useStoryPager.js#L5) | `PAGE_TRANSITION_SECONDS`, `MIN_PAGE_TRANSITION_SECONDS`, `PAGE_DISTANCE_SPEEDUP_SECONDS` |
| Trackpad sensitivity and release | [`useStoryPager.js#L14`](../src/hooks/useStoryPager.js#L14), [`useStoryPager.js#L17`](../src/hooks/useStoryPager.js#L17) | `WHEEL_THRESHOLD_PX`, `WHEEL_RELEASE_MS` |
| Transition interruption and gesture boundary | [`useStoryPager.js#L95`](../src/hooks/useStoryPager.js#L95), [`useStoryPager.js#L249`](../src/hooks/useStoryPager.js#L249) | `goToPage`, wheel gesture detection, and retargeting |
| Mobile swipe sensitivity | [`useStoryPager.js#L20`](../src/hooks/useStoryPager.js#L20) | `TOUCH_THRESHOLD_PX` |
| Scene animation timing | [`App.jsx#L373`](../src/App.jsx#L373) | GSAP timeline labels and `.to(...)` entries |
| Number/order of stops | [`App.jsx#L13`](../src/App.jsx#L13) | `STORY_PAGES` |
| Input lock and overscroll behavior | [`useStoryPager.js#L264`](../src/hooks/useStoryPager.js#L264) | Wheel, touch, keyboard, boundary, and cleanup handlers |
| Scroll-stop CSS fallback | [`styles.css#L78`](../src/styles.css#L78) | `.story`, `.story-pages`, `.story-page`, `scroll-snap-*` |
| Colors, typography, layout | [`styles.css#L3`](../src/styles.css#L3) | CSS variables and component classes |
| Project card content | [`App.jsx#L24`](../src/App.jsx#L24) | `PROJECT_ITEMS` |
| Contact details | [`App.jsx#L31`](../src/App.jsx#L31) | `CONTACT_ITEMS` |
