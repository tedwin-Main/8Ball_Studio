# Learn the motion system, and what changed

A guide for someone new to web motion. Every setting, term and change is one table row: what it is, its value, what it controls, and which tool does it.

Line numbers are correct at the commit after `52235e2` on `main`. If a line moved, search the file for the code shown.

---

## 1. The Story's parts

| Word | What it means |
|---|---|
| **Story** | The whole page, from top to bottom. |
| **Page** | One chapter of the Story: Intro, Studio, Projects, Contact. |
| **Handoff** | The move from one Page to the next. Projects rises over Studio; Contact is uncovered under Projects. |
| **Run** | Projects stays still while its cards slide sideways. |
| **Draft** | A version of the Intro: 01 3D POV (default), 02 3D Break, 03 Original. |
| **Look** | A whole-site theme: Main (default), Cyc Wall, Pool Table. |
| **Glide** | The page moving by itself to a Page (after a header link, a Page key, or one scroll on the Intro). |

---

## 2. How a scroll becomes a frame

```text
Your wheel, trackpad or finger
  -> Story navigation: free scroll, the one-scroll Intro, or a glide?   (src/storyNavigation.js)
  -> Lenis (glide): the page eases toward your scroll                    (src/storyNavigationBrowser.js)
  -> GSAP ticker: runs Lenis once per frame
  -> ScrollTrigger: reads Lenis's position
  -> GSAP scrub (weight): animations ease toward that position           (src/App.jsx, src/motion/flowMotion.js)
  -> the browser paints the frame
```

| Part | Film-set job | Tool |
|---|---|---|
| Story navigation | The director: decides when the camera moves freely and when it glides to a mark. | Own code |
| Lenis | The camera dolly: moves the camera smoothly instead of jerking. | Lenis |
| GSAP timelines | The actors' blocking: where each thing is at each moment. | GSAP |
| ScrollTrigger | Ties the blocking to the dolly position. | GSAP plugin |

### Two smoothing layers stack

| Layer | Setting | How long it takes to settle | Tool |
|---|---|---|---|
| 1. The page | `glide` 0.08 | About 0.45 s after you stop | Lenis `lerp` |
| 2. The animations | `weight` 0.4 (0.2 on Projects and Contact) | Another 0.2 to 0.4 s after the page | GSAP `scrub` |
| **Total** | | **About 0.65 to 0.85 s of drift** | |

The drift is what feels floaty. Setting `weight` to 0 removes layer 2: animations then lock exactly to the page (`scrub: true`), the way GSAP and Lenis showcase sites work.

---

## 3. The seven settings (dials)

All seven are in [src/storyTiming.js](../src/storyTiming.js). Open the site with `?tune` to change them live.

| Setting | Line | Value | What it controls | Tool |
|---|---|---|---|---|
| `glide` | [4](../src/storyTiming.js#L4) | 0.08 | How long the page coasts after you stop. Each frame, the page moves 8% of the way to where your scroll aims. Smaller = longer coast; 1 = no coast. | Lenis `lerp` |
| `wheel` | [6](../src/storyTiming.js#L6) | 0.4 | How far one wheel notch moves the page: 40% of the normal distance. Changes distance, not speed. | Lenis `wheelMultiplier` |
| `weight` | [8](../src/storyTiming.js#L8) | 0.4 | How many seconds animations trail behind the page. The Intro and Studio use 0.4 s; Projects and Contact use half, 0.2 s. 0 = locked to the page. | GSAP ScrollTrigger `scrub` |
| `introSeconds` | [10](../src/storyTiming.js#L10) | 3 | How long the pool break plays after one scroll on the Intro. | Story navigation glide |
| `depth` | [12](../src/storyTiming.js#L12) | 0.3 | How strong the Handoffs are: rise, shrink, dim, shadow. 0 = flat, 2 = double. | Multiplier in `flowMotion.js` |
| `speedLimit` | [15](../src/storyTiming.js#L15) | 0.6 | The top speed of wheel and trackpad scrolling: the scroll target may run at most 0.6 of a screen ahead of the page. Lower = heavier, slower flicks; 0 = off. Phones keep their native swipe. | Lenis `virtualScroll` hook + [scrollLead.js](../src/scrollLead.js) |
| `skew` | [17](../src/storyTiming.js#L17) | 1.5 | The most degrees the Projects cards lean when you scroll fast. | GSAP `quickTo` |

### History of the dials

| Stage | `glide` | `wheel` | `weight` | Feel |
|---|---|---|---|---|
| First build | 0.05 | 0.8 | 1.2 s (0.6 s after the stage) | Very heavy, cinematic |
| Tuned toward hugeinc.com | 0.1 | 0.7 | 0.4 s (0.2 s after the stage) | Lighter, closer to the hand |
| Now | 0.08 | 0.4 | 0.4 s (0.2 s after the stage), plus a speed limit of 0.6 screen | Heavier coast, shorter travel per notch, no racing flicks |

### Fixed values next to the code (not dials)

| Value | Where | Setting | What it controls |
|---|---|---|---|
| Rewind intent | [storyNavigation.js:12](../src/storyNavigation.js#L12) | 120 px within 800 ms | How much upward scroll at Studio plays the break back. |
| Rewind time | [useStoryPager.js:10](../src/hooks/useStoryPager.js#L10) | 1 s | How long the break takes to play back. |
| Page glide time | [useStoryPager.js:13](../src/hooks/useStoryPager.js#L13) | 0.7 s + 0.14 s per screen, max 1.5 s | How long a header-link or Page-key glide takes. |
| Glide ease | [useStoryPager.js:68](../src/hooks/useStoryPager.js#L68) | quart ease-out | Fast start, long soft landing. |
| Handoff amounts | [flowMotion.js:12](../src/motion/flowMotion.js#L12) | rise 8vh, shrink 3.5%, dim 35%, Contact offset 25%, edge shadow 40% | The strength of each Handoff at `depth` 1. |
| Cursor lag | [CursorBall.jsx:9](../src/components/CursorBall.jsx#L9) | 0.18 s | How far the cue-ball cursor trails the pointer. |
| Browser-chrome limit | [viewportResize.js:8](../src/viewportResize.js#L8) | 180 px | The largest height change treated as the phone's address bar sliding. |

---

## 4. The words

### 4.1 Lenis (the smooth scroll)

Set up at [storyNavigationBrowser.js:67](../src/storyNavigationBrowser.js#L67).

| Term | Value here | What it controls | Tool |
|---|---|---|---|
| `lerp` | `glide` (0.08) | Each frame, move a fraction of the remaining distance. That is why the page slows down smoothly. | Lenis option |
| `wheelMultiplier` | `wheel` (0.4) | Distance per wheel notch. | Lenis option |
| `syncTouch` | `false` | Phones keep their own swipe momentum; Lenis does not smooth touch. | Lenis option |
| `autoRaf` | `false` | Lenis does not run its own frame loop; GSAP's ticker runs it (one clock for everything). | Lenis option |
| `autoResize` | `false` | Story navigation decides when Lenis measures the page again. | Lenis option |
| `virtualScroll` | Story navigation's handler, then the speed limit | Sees every wheel and touch input first. Returning `false` blocks it (holding the page during the break, cancelling a glide, stopping the rubber band). Changing `input.deltaY` changes how far the input moves the page: the speed limit trims it here. | Lenis option |
| `scrollTo(y, options)` | used for every glide | Moves the page: with `duration` and `easing` it glides; with `immediate` it jumps; with `lock` input is ignored. | Lenis method |
| `stop()` / `start()` | preloader, `cancelGlide` | Freeze and unfreeze scrolling. `stop()` then `start()` also ends a glide early. | Lenis method |
| `resize()` | `syncLimits`, refresh | Measures the page length again. | Lenis method |
| `velocity` | read by the skew | How fast the page moves, in pixels per frame. | Lenis property |

### 4.2 GSAP (the animations)

| Term | Example here | What it controls | Tool |
|---|---|---|---|
| tween | everywhere | One animation of one or more properties. `gsap.to(el, { x: 100 })` moves `el` to x = 100. | GSAP |
| `to` / `from` / `fromTo` | [flowMotion.js:125](../src/motion/flowMotion.js#L125) | Animate to values, from values, or from A to B. | GSAP |
| timeline | Intro timeline, [App.jsx:794](../src/App.jsx#L794) | Plays many tweens in order or together. Position numbers (`0`, `'+=0.12'`) set when each starts. | GSAP |
| `duration` | | In a normal tween: seconds. In a scrubbed timeline: a share of the scroll distance. | GSAP |
| `ease` | | The speed curve. `none` = constant; `power2.out` = fast then soft; `power4.out` = stronger; `expo.out` = strongest. | GSAP |
| `CustomEase` | `cue`, [App.jsx:37](../src/App.jsx#L37) | An ease drawn as a curve: a studio light snapping on, then settling. | GSAP plugin |
| `stagger` | title words, [introEntrance.js:74](../src/motion/introEntrance.js#L74) | Starts the same tween on many elements one after another. | GSAP |
| `autoAlpha` | the Top cut | Opacity plus visibility. At 0 the element also leaves clicks and Tab order. | GSAP |
| `xPercent` / `yPercent` | the rolling 8-ball | Moves by a share of the element's own size. | GSAP |
| `quickTo` | skew, [velocitySkew.js:35](../src/motion/velocitySkew.js#L35) | A fast "follow this value" function that re-aims one tween instead of making new ones. | GSAP |
| ticker | [storyNavigationBrowser.js:130](../src/storyNavigationBrowser.js#L130) | GSAP's frame loop (60 or 120 times a second). Lenis runs inside it. | GSAP |
| `lagSmoothing(0)` | [storyNavigationBrowser.js:132](../src/storyNavigationBrowser.js#L132) | Stops GSAP from skipping ahead after a slow frame, so the scroll never jumps. | GSAP |
| `context` / `revert` | App.jsx | Collects every tween, so one `revert()` undoes them all (on a Look change or unmount). | GSAP |
| `matchMedia` | App.jsx | Runs different animation code for desktop and phones. | GSAP |

### 4.3 ScrollTrigger (animations tied to the scroll)

| Term | Example here | What it controls | Tool |
|---|---|---|---|
| `trigger` | `projects` | The element whose position drives the animation. | ScrollTrigger |
| `start` / `end` | `'top bottom'` to `'top top'` | "Element edge, screen edge": begin when Projects' top reaches the screen's bottom, end when it reaches the top. | ScrollTrigger |
| `scrub` | `toScrub( weight )`, [App.jsx:75](../src/App.jsx#L75) | A number = seconds of catch-up lag; `true` = locked to the page. 0 used to switch scrubbing off by mistake; it now means `true`. | ScrollTrigger |
| `containerAnimation` | cards in the Run, [flowMotion.js:159](../src/motion/flowMotion.js#L159) | Lets a trigger follow a sideways animation instead of the vertical scroll. | ScrollTrigger |
| `scrollerProxy` | [storyNavigationBrowser.js:108](../src/storyNavigationBrowser.js#L108) | Makes ScrollTrigger read the position from Lenis. | ScrollTrigger |
| `ignoreMobileResize` | [storyNavigationBrowser.js:13](../src/storyNavigationBrowser.js#L13) | Ignores a phone's address bar sliding. | ScrollTrigger config |
| `refresh` | | Measures every start and end again. | ScrollTrigger |
| pin | not used | Holds an element still. This site uses CSS `position: sticky` instead (cheaper). | ScrollTrigger |

### 4.4 CSS and the browser

| Term | What it means |
|---|---|
| transform, translate, scale, rotate | Move, resize or turn without changing the layout. The GPU does it, so it is cheap. |
| opacity | Transparency. Also cheap. |
| clip-path, mask-image | Show only part of an element. A mask uses a gradient as a stencil. |
| custom property (`--name`) | A CSS variable. Changing it re-styles that element and everything inside it. |
| style recalc | The browser working out final styles. Too much every frame causes jank. |
| `position: sticky` | Scrolls normally, then stays stuck while its parent scrolls past. |
| `svh` | "Small viewport height": a phone's height with the address bar shown. It does not change when the bar slides, so the layout stays still. |
| `overscroll-behavior` | Stops the page from stretching past its ends (the rubber band) where the browser supports it. |
| `prefers-reduced-motion` | A system setting. With it on, the site turns off Lenis and big motion. |
| `pointer: coarse` / `fine` | Touch screen / mouse or trackpad. |
| 44 × 44 px | The smallest comfortable target for a finger. |
| draw call | One request to the GPU to draw one 3D object. |

### 4.5 Ease curves

| Ease | Shape | Used for |
|---|---|---|
| `none` | Straight line, constant speed | Most scroll-scrubbed moves (the scroll gives the feel). |
| `power2.out` | Fast start, soft end | Content arriving, the ball rolling in. |
| `power4.out` | Stronger fast start | Title words rising out of their masks. |
| quart ease-out | Half the way in the first 16% of the time | Page glides. |
| `expo.out` | Half the way in the first 7% of the time | Replaced for glides: it read as a jump on phones. |
| `.in` eases | Soft start, fast end | Things leaving (the cut cover fading up). |

---

## 5. What changed

### 5.1 `/impeccable` pass

#### Item 1. Scroll control

| Change | Before | Now | Where |
|---|---|---|---|
| Rewind of the break | 14 px of upward scroll rewound it | 120 px within 800 ms | [storyNavigation.js:12](../src/storyNavigation.js#L12) |
| Rewind time | 1.6 s | 1 s | [useStoryPager.js:10](../src/hooks/useStoryPager.js#L10) |
| Input during a glide | Blocked | Against the glide: turns it around (inside the break) or stops it (elsewhere) | [storyNavigation.js:590](../src/storyNavigation.js#L590), [618](../src/storyNavigation.js#L618) |
| Stopping Lenis mid-glide | Not possible | `cancelGlide()`: `stop()` then `start()` | [storyNavigationBrowser.js:203](../src/storyNavigationBrowser.js#L203) |
| Arrow keys, Space | Jumped a whole Page (skipped the Run) | Scroll natively; on the Intro they play the break | [storyNavigation.js:700](../src/storyNavigation.js#L700) |
| Space on a focused button | Scrolled the page | Presses the button | [storyNavigation.js:733](../src/storyNavigation.js#L733) |

#### Item 2. Handoff colours (the Sheet Rule)

| Change | Before | Now | Where |
|---|---|---|---|
| Page colours in a Handoff | Mixed with the scroll: grey and olive halfway | Each Page is its own colour from the first pixel | [acid.css:262](../src/looks/acid.css#L262) |
| Shade over Contact | Flat 60% dark wash | Soft shadow under Projects' edge only (a CSS mask), 40% | [styles.css:691](../src/styles.css#L691), [flowMotion.js:12](../src/motion/flowMotion.js#L12) |

#### Item 3. The opening shot

| Change | Before | Now | Where |
|---|---|---|---|
| After the preloader | A still picture | Words rise out of masks (`power4.out`, stagger 0.08 s), services settle, table settles from 106% | [introEntrance.js:8](../src/motion/introEntrance.js#L8), [61](../src/motion/introEntrance.js#L61) |
| Start signal | None | The preloader calls `onReveal` as its cover lifts | [Preloader.jsx:107](../src/components/Preloader.jsx#L107) |
| First frame | White | Night green | [index.html:8](../index.html#L8) |

#### Item 4. Performance

| Measure | Before | After | Fix | Where |
|---|---|---|---|---|
| First-load size | 1,791 KB | 671 KB | Draft 02 builds (and loads 1 MB of walnut textures) only when chosen | [PhotorealPoolDraft.jsx:395](../src/drafts/PhotorealPoolDraft.jsx#L395) |
| Extra font on Main | Archivo, 88 KB | None | Ball numbers use Space Grotesk | [poolSurfaceTextures.js:91](../src/drafts/poolSurfaceTextures.js#L91) |
| Hidden 3D draws, pointer moving 3 s | about 11,500 | 0 | Parallax renders only while the table is visible | [PoolPovDraft.jsx:462](../src/drafts/PoolPovDraft.jsx#L462), [PhotorealPoolDraft.jsx:382](../src/drafts/PhotorealPoolDraft.jsx#L382) |
| Style recalc, pointer moving 3 s | about 750 ms | about 90 ms | Pointer light written only on its readers, not the page root | [lookRegistry.js:45](../src/looks/lookRegistry.js#L45), [App.jsx:560](../src/App.jsx#L560) |

#### Items 5 and 6. Controls and polish

| Change | Before | Now | Where |
|---|---|---|---|
| Touch targets | Some 24 to 36 px | At least 44 × 44 px on touch screens | [styles.css:1654](../src/styles.css#L1654) |
| Short landscape screens | Title overlapped the footer and cards | Rows instead of columns; titles sized from the screen height (`svh`) | [acid.css:582](../src/looks/acid.css#L582) |

### 5.2 `/taste-skill` premium pass

| Change | Before | Now | Where |
|---|---|---|---|
| Draft and Look pickers | On every Page for every visitor | Only in the `?tune` panel | [TunePanel.jsx:74](../src/components/TunePanel.jsx#L74), [App.jsx:1250](../src/App.jsx#L1250) |
| Contact labels | "Start a project", "Contact us", three equal channels | "Contact us" everywhere; WhatsApp is one full-width action | [App.jsx:147](../src/App.jsx#L147), [styles.css:1976](../src/styles.css#L1976) |
| Skew | 4°, on titles and Contact too, also during glides | 1.5°, cards only, never during a glide | [velocitySkew.js:41](../src/motion/velocitySkew.js#L41) |
| Page glides | 1.2 s always, slow-in slow-out | 0.7 s + 0.14 s per screen, quart ease-out | [useStoryPager.js:13](../src/hooks/useStoryPager.js#L13), [68](../src/hooks/useStoryPager.js#L68) |
| Top, wordmark, Home | Glided backwards through the whole break | A cut: the night fades up, the page jumps, it fades away | [App.jsx:950](../src/App.jsx#L950), [styles.css:2103](../src/styles.css#L2103) |
| End of Contact | A flat list | The 8-ball rolls in and drops into a pocket, scrubbed by the scroll | [App.jsx:1190](../src/App.jsx#L1190), [flowMotion.js:221](../src/motion/flowMotion.js#L221), [styles.css:2050](../src/styles.css#L2050) |

### 5.3 Mobile pass

| Change | Before | Now | Where |
|---|---|---|---|
| Address bar sliding | Treated as a resize: full refresh and a snap mid-glide | Only Lenis's limit is updated (`syncLimits`) | [viewportResize.js:8](../src/viewportResize.js#L8), [storyNavigation.js:779](../src/storyNavigation.js#L779), [storyNavigationBrowser.js:249](../src/storyNavigationBrowser.js#L249), [App.jsx:523](../src/App.jsx#L523) |
| iOS momentum during a glide | Momentum and the glide fought over the page | `overflow: hidden` while a glide runs on touch screens | [styles.css:2117](../src/styles.css#L2117) |
| Pulling past the top or bottom | The page stretched (rubber band) | The touch is held still | [storyNavigation.js:648](../src/storyNavigation.js#L648) |
| Glide start | `expo.out`: half the way in about 80 ms, read as a jump | Quart ease-out | [useStoryPager.js:68](../src/hooks/useStoryPager.js#L68) |

### 5.4 Feel pass

| Change | Before | Now | Where |
|---|---|---|---|
| `weight` at 0 | Turned scrubbing off (animations jumped) | Locks animations to the page (`scrub: true`) | [App.jsx:75](../src/App.jsx#L75) |
| `wheel` | 0.7 | 0.4 | [storyTiming.js:6](../src/storyTiming.js#L6) |
| `glide` | 0.1 | 0.08 (heavier coast) | [storyTiming.js:4](../src/storyTiming.js#L4) |
| Speed limit | None: a hard flick raced | The target may lead the page by at most 0.6 screen, so every flick has the same steady top speed (0.08 × 0.6 screen per frame) | [scrollLead.js](../src/scrollLead.js), [storyNavigationBrowser.js:79](../src/storyNavigationBrowser.js#L79) |
| Frame measurement, Studio to Contact | | 0% of frames over 20 ms, even with the CPU slowed 4× (desktop) and 6× (phone size) | production build |

---

## 6. Experiment safely

| Address | What it does |
|---|---|
| `?tune` | The owner panel: Intro draft, Look, and one slider per dial. "Copy values" gives lines to paste into `src/storyTiming.js`. |
| `?look=cyc`, `?look=downlight` | Opens another Look. |
| `?draft=photoreal`, `?draft=original` | Opens another Draft. |

| Try | Compare | What you will feel |
|---|---|---|
| `glide` | 0.05 vs 0.2 | Heavy coast vs snappy stop |
| `wheel` | 0.4 vs 1 | Short vs long travel per wheel notch |
| `weight` | 0 vs 0.4 | Locked to the page vs trailing |
| `depth` | 0 vs 2 | Flat vs dramatic Handoffs |
| `speedLimit` | 0.3 vs 0 (off) | A slow, heavy flick vs one that races |
| `skew` | 0 vs 6 | Still vs wobbly cards |

Judge the feel on a production build (`npm run build && npm run preview`); the dev server is slower. Turn on Reduce motion in macOS System Settings > Accessibility > Display to see the calm version. After any change, run `npm test` (100 tests) and `npm run build`.
