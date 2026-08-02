# 8Ball Studio — QA Architecture Guide

## What this site is

8Ball Studio is one scroll story, not a normal multi-page website.

The visitor scrolls through five fixed story stops:

1. **Intro** — close-up 8 ball and pool table.
2. **Shot** — table is zoomed out; cue stick is ready behind the 8 ball.
3. **Studio** — ball is hit, goes into the pocket, then **8Ball Studio** appears.
4. **Projects** — client work moves in an infinite marquee loop.
5. **Contact** — contact details appear.

## Main tools, in simple terms

| Tool | Main job | QA meaning |
| --- | --- | --- |
| **React 19** | Builds the page from small UI parts. | Text, buttons, pool table, 8 ball, and contact cards are React components. |
| **Vite 7** | Runs the site locally and builds the production files. | Used when starting the local development site. It is not part of the visual animation. |
| **GSAP** | JavaScript animation library. | Moves, fades, scales, rotates, and reveals visual elements smoothly. |
| **GSAP ScrollTrigger** | Connects GSAP animation to page scroll position. | Scrolling forward plays the story; scrolling backward reverses it. |
| **CSS** | Visual styling and browser-level behavior. | Creates the pool table look, responsive layout, fixed stage, scroll stops, hover states, and reduced-motion behavior. |

## Important files

| File | Plain-English purpose |
| --- | --- |
| `src/main.jsx` | Starts React and loads the app. |
| `src/App.jsx` | Main story structure and all GSAP animation timing. |
| `src/styles.css` | Visual design, responsive layout, sticky stage, and scroll-stop rules. |
| `package.json` | List of JavaScript libraries and project commands. |
| `index.html` | Basic browser page shell. |

## How the page works

```text
Browser opens page
  → React loads App.jsx
  → CSS builds the visual scene and five scroll stops
  → GSAP prepares each animated element
  → ScrollTrigger links scroll position to the GSAP story timeline
  → Visitor scrolls forward or backward through the story
```

### 1. Fixed visual stage

The pool table scene stays fixed on screen while the document scrolls behind it.

- CSS class: `.stage`
- Behavior: `position: sticky`
- Purpose: visitor sees one cinematic canvas while scrolling changes the animation state.

### 2. Scroll checkpoints

There are five equal story sections. Each is one screen tall (`100svh`).

- CSS uses `scroll-snap-type: y mandatory`.
- Each section uses `scroll-snap-stop: always`.
- Result: browser should stop at Intro, Shot, Studio, Projects, or Contact instead of leaving the story between scenes.

The page dots on the right use the same five checkpoints.

### 3. Full story motion scrub

**Scrub** means animation follows scroll position instead of playing once on its own.

Current setting:

```js
const STORY_SCRUB_SECONDS = 4
```

This is in `src/App.jsx`.

Plain meaning:

- Scroll a little: animation moves a little.
- Scroll backward: animation reverses.
- Scroll very fast: visuals catch up smoothly instead of jumping instantly.
- `4` means the visual animation eases toward the new scroll position over about four seconds.

Scrub changes animation feel. It does **not** create the scroll stops. CSS scroll snap creates the stops.

## Story animation flow

### Stop 1 — Intro

- Pool table and 8 ball start large and close to camera.
- Hero text and scroll prompt are visible.
- As scroll begins, table zooms out and the hero text fades away.

### Stop 2 — Shot

- Table is fully visible.
- 8 ball is in position.
- Cue stick arrives and waits behind the ball.
- This is the pause point before the hit.

### Stop 3 — Studio

- Cue strikes the ball.
- Impact ring and flash appear.
- Ball rolls to the top-right pocket and sinks.
- Pocket iris expands slowly.
- Pool scene fades away.
- **8Ball Studio** title appears.

### Stop 4 — Projects

- Studio title exits slowly.
- “Our Projects” heading appears.
- Project images move continuously in an infinite marquee loop.

### Stop 5 — Contact

- Projects page exits slowly.
- Contact screen fades in.
- “Contact Us” heading appears.
- WhatsApp, Instagram, and Kuala Lumpur cards reveal in sequence.

## Animation ownership

| Visual item | Controlled by |
| --- | --- |
| Pool table zoom, tilt, fade | GSAP timeline in `App.jsx` |
| 8 ball position, roll, rotation, sink | GSAP timeline in `App.jsx` |
| Cue stick, impact ring, flash, pocket iris | GSAP timeline in `App.jsx` |
| Studio, Projects, and Contact screen reveals | GSAP timeline in `App.jsx` |
| Projects marquee loop | CSS animation in `styles.css` |
| Pool table design, colors, shadows, orbits | `styles.css` |
| Scroll stops and sticky canvas | `styles.css` |
| Cursor dot and ring | GSAP in `App.jsx` + CSS styling |

## Responsive and accessibility behavior

### Screen size

GSAP checks screen size before placing the table, cue, and ball.

- Desktop uses larger table scale and desktop pocket coordinates.
- Compact, mobile, and landscape screens use alternate positions.

### Reduced motion

If visitor enables **Reduce Motion** in operating system settings:

- The page shows stable story states instead of running the full animation.
- Cursor decoration and looping scroll prompt are hidden.
- This is expected behavior, not a bug.

## QA quick checks

1. Scroll one checkpoint at a time: Intro → Shot → Studio → Projects → Contact.
2. Scroll back. Story should reverse without broken layout.
3. At Shot, cue should be visible but ball should not be struck yet.
4. At Studio, ball should already be sunk and title should be readable.
5. At Projects, the marquee should loop with no blank gap.
6. At Contact, title, heading, and all three contact cards should finish visible.
7. Click every page dot. It should go to the matching story stop.
8. Resize browser to desktop and mobile widths. Table, ball, cue, and text should remain on-screen.
9. Test reduced-motion setting. Site should remain usable with minimal animation.

## Where to change common things

| Wanted change | File | What to look for |
| --- | --- | --- |
| Overall story speed | [src/App.jsx](../src/App.jsx#L12) | `STORY_SCRUB_SECONDS` |
| Ball, cue, title, Projects, or Contact timing | [src/App.jsx](../src/App.jsx#L356) | `timeline.to(...)` entries |
| Number or order of story stops | [src/App.jsx](../src/App.jsx#L14) | `STORY_PAGES` |
| Scroll stop behavior | [src/styles.css](../src/styles.css#L70) | `.story`, `.story-pages`, `.story-page`, `scroll-snap-*` |
| Colors, typography, layout | [src/styles.css](../src/styles.css#L3) | CSS variables and component classes |
