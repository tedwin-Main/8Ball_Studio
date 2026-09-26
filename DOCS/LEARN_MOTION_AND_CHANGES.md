# Learn the motion system, and what changed (September 2026)

This guide is for someone new to web design and motion code. It explains:

1. How the site moves (the pipeline from your finger to the screen).
2. The words: every Lenis, GSAP and CSS term the code uses, in plain English.
3. What changed in the two passes: `/impeccable` (6 items) and `/taste-skill` (premium pass). For each change: the files, the line numbers, a code snippet, and why.
4. How to experiment safely.

Line numbers are correct at commit `a0f07f0` on `main`. If a line moved, search the file for the snippet text.

---

## 1. How the site moves

The site is one long page. The words for its parts are in [CONTEXT.md](../CONTEXT.md):

- **Story:** the whole page, from top to bottom.
- **Page:** one chapter of the Story: Intro, Studio, Projects, Contact.
- **Handoff:** the move from one Page to the next (Projects rises over Studio; Contact is uncovered under Projects).
- **Run:** the part where Projects stays still and its cards slide sideways.
- **Draft:** a version of the Intro (01 3D POV, 02 3D Break, 03 Original).
- **Look:** a whole-site theme (Main, Cyc Wall, Pool Table).

Every scroll goes through this chain:

```text
Your wheel, trackpad or finger
  -> Story navigation decides: free scroll, or a glide to a Page?   (src/storyNavigation.js)
  -> Lenis smooths the scroll position                               (src/storyNavigationBrowser.js)
  -> GSAP's ticker runs Lenis once per frame
  -> Lenis tells ScrollTrigger the new position
  -> ScrollTrigger moves the scrubbed GSAP timelines                 (src/App.jsx, src/motion/flowMotion.js)
  -> the browser paints the frame
```

Think of it like a film set:

- **Lenis** is the camera dolly. It makes the camera move smoothly instead of jerking.
- **GSAP timelines** are the actors' blocking: where each thing is at each moment.
- **ScrollTrigger** ties the blocking to the dolly position, so actors move when the camera moves.
- **Story navigation** is the director: it decides when the camera may move freely and when it glides to a mark.

---

## 2. The words

### 2.1 The six settings (the dials)

All six live in [src/storyTiming.js](../src/storyTiming.js) (lines 2-15). Open any page with `?tune` at the end of the address to get sliders for them.

| Setting | Line | Value | What it means |
|---|---|---|---|
| `glide` | [4](../src/storyTiming.js#L4) | `0.1` | How long the page keeps coasting after you stop scrolling. Each frame, the page closes 10% of the gap to where it is going. Smaller = longer, heavier coast. `1` = no coast. This is Lenis's `lerp`. |
| `wheel` | [6](../src/storyTiming.js#L6) | `0.7` | How far one wheel notch moves the page. `0.7` = 70% of the normal distance. This is Lenis's `wheelMultiplier`. |
| `weight` | [8](../src/storyTiming.js#L8) | `0.4` | How many seconds the animations trail behind the scroll. It gives the feeling of heavy objects catching up. This is GSAP's `scrub` in seconds. Projects and Contact use half (`0.2`). |
| `introSeconds` | [10](../src/storyTiming.js#L10) | `3` | How long the pool break plays after one scroll on the Intro. |
| `depth` | [12](../src/storyTiming.js#L12) | `1` | How strong every Handoff is (how far things rise, shrink, dim, shift). `0` = flat, `2` = double. |
| `skew` | [14](../src/storyTiming.js#L14) | `1.5` | The most degrees the Projects cards lean when you scroll fast. Changed from `4` in the premium pass. |

### 2.2 Lenis terms

Lenis is a small library that replaces the browser's scroll with a smoothed one. It is set up in [src/storyNavigationBrowser.js](../src/storyNavigationBrowser.js) at [line 65](../src/storyNavigationBrowser.js#L65).

```js
lenis = new Lenis( {
  wheelMultiplier: wheel,     // distance per wheel notch (the "wheel" dial)
  syncTouch: false,           // phones keep their own native swipe momentum
  lerp: glide,                // the "glide" dial
  autoRaf: false,             // Lenis does not run its own frame loop; GSAP runs it
  autoResize: false,          // Story navigation tells Lenis when the page size changes
  virtualScroll: ( input ) => virtualScrollHandler( input ),  // every wheel/touch input goes here first
} )
```

| Term | Meaning |
|---|---|
| **lerp** | "Linear interpolation." Each frame, move a fraction of the remaining distance. With `0.1`, the page moves 10% of the way, then 10% of what is left, and so on. That is why it slows down smoothly. |
| **wheelMultiplier** | A multiplier on each wheel event's distance. |
| **syncTouch** | If `true`, Lenis also smooths finger swipes. We keep it `false`: phones already have good momentum. |
| **autoRaf** | "Auto requestAnimationFrame." If `true`, Lenis runs its own frame loop. We set `false` so GSAP runs it (one clock for everything). |
| **virtualScroll** | A hook that sees every input before Lenis uses it. Return `false` to block the input. Story navigation uses this to hold the page still during the break or to cancel a glide. |
| **scrollTo(y, options)** | Moves the page to `y`. With `duration` and `easing`, it glides; with `immediate: true`, it jumps. With `lock: true`, user input is ignored during the glide. |
| **stop() / start()** | Freeze and unfreeze scrolling. The preloader uses them. `cancelGlide()` also uses them to end a glide early. |
| **velocity** | How fast the page is moving (pixels per frame). The skew reads it. |
| **resize()** | Tells Lenis to measure the page again. |

### 2.3 GSAP terms

GSAP is an animation library. It changes numbers over time (positions, sizes, opacity).

| Term | Meaning | Example in this project |
|---|---|---|
| **tween** | One animation of one or more properties. `gsap.to(el, {x: 100})` moves `el` to x = 100. | everywhere |
| **to / from / fromTo** | `to`: animate from now to these values. `from`: from these values to now. `fromTo`: from A to B. | [flowMotion.js:125](../src/motion/flowMotion.js#L125) |
| **timeline** | A container that plays many tweens in order or at the same time. Position numbers (`0`, `'+=0.12'`) say when each tween starts. | the Intro timeline, [App.jsx:790](../src/App.jsx#L790) |
| **duration** | Length of a tween. In a normal tween it is seconds. In a scrubbed timeline it is only a share of the scroll distance. | |
| **ease** | The shape of the speed curve. `none` = constant speed. `power2.out` = fast start, soft end. `power4.out` = even stronger. `expo.out` = very fast start, very long soft end. `back.out` = goes past the end and comes back. | |
| **CustomEase** | An ease drawn as a curve. This site has one called `cue`: a studio light snapping on, then settling. | [App.jsx:40](../src/App.jsx#L40) |
| **stagger** | Starts the same tween on many elements one after another (for example, letters of a title). | [introEntrance.js:73-79](../src/motion/introEntrance.js#L73) |
| **autoAlpha** | Opacity plus visibility. At `0` the element is also hidden from clicks and keyboard focus. | the Top cut |
| **xPercent / yPercent** | Move by a percentage of the element's own size (not the page). | the rolling 8-ball |
| **quickTo** | A fast "follow this value" function. Each call re-aims one ongoing tween instead of making a new one. Good for following a pointer or the scroll speed. | [velocitySkew.js:35](../src/motion/velocitySkew.js#L35) |
| **ticker** | GSAP's frame loop (runs about 60 or 120 times a second). Lenis is driven from it. | [storyNavigationBrowser.js:128](../src/storyNavigationBrowser.js#L128) |
| **lagSmoothing(0)** | Turns off GSAP's "skip ahead after a slow frame" behaviour, so the scroll never jumps. | [storyNavigationBrowser.js:130](../src/storyNavigationBrowser.js#L130) |
| **gsap.context / revert** | Collects every tween made inside it, so one `revert()` undoes all of them (when the Look changes or the page unmounts). | App.jsx |
| **matchMedia** | Runs different animation code for desktop and for phones, and swaps it when the screen size changes. | App.jsx |

### 2.4 ScrollTrigger terms

ScrollTrigger is a GSAP plugin that connects animations to the scroll position.

```js
scrollTrigger: {
  trigger: projects,       // the element to watch
  start: 'top bottom',     // begin when the element's TOP reaches the screen's BOTTOM
  end: 'top top',          // finish when the element's TOP reaches the screen's TOP
  scrub,                   // tie progress to the scroll (a number = seconds of catch-up lag)
  invalidateOnRefresh: true, // recompute values when the screen size changes
}
```

| Term | Meaning |
|---|---|
| **trigger** | The element whose position controls the animation. |
| **start / end** | Two words: "element edge" and "screen edge". `'top 70%'` = when the element's top is 70% down the screen. |
| **scrub** | `true` = the animation follows the scroll exactly. A number (for example `0.4`) = it follows with that many seconds of lag. This is the **weight** dial. |
| **pin** | Holds an element still on the screen while you scroll. This site uses CSS `position: sticky` instead, which does the same thing more cheaply. |
| **containerAnimation** | Lets a trigger follow a sideways animation instead of the vertical scroll. Each Projects card uses it to know when it crosses the centre of the Run ([flowMotion.js:159](../src/motion/flowMotion.js#L159)). |
| **scrollerProxy** | Tells ScrollTrigger to read the scroll position from Lenis instead of the browser ([storyNavigationBrowser.js:106](../src/storyNavigationBrowser.js#L106)). |
| **refresh** | ScrollTrigger measures every start and end again (after a resize or a font load). |

### 2.5 CSS and browser terms

| Term | Meaning |
|---|---|
| **transform / translate / scale / rotate** | Move, resize or turn an element without changing the page layout. The GPU does it, so it is cheap. |
| **opacity** | Transparency. Also cheap. |
| **clip-path / mask-image** | Show only part of an element. `clip-path: inset(...)` cuts a rectangle. `mask-image` uses a gradient as a stencil (black = visible, transparent = hidden). |
| **custom property (`--name`)** | A CSS variable. Changing one on an element re-styles that element and everything inside it. |
| **style recalc** | The browser working out the final style of elements. Too much of it every frame causes jank. |
| **will-change** | A hint that an element will animate, so the browser prepares a GPU layer. Use it sparingly. |
| **position: sticky** | An element scrolls normally, then stays stuck at an edge while its parent scrolls past. |
| **prefers-reduced-motion** | A user setting (System Settings > Accessibility). When it is on, this site turns off Lenis and big motion. |
| **pointer: coarse / fine** | `coarse` = touch screen. `fine` = mouse or trackpad. |
| **44 × 44 px** | The minimum comfortable size for a finger target (Apple and WCAG guidance). |
| **WebGL / draw call** | WebGL draws 3D on the GPU. A draw call is one request to draw one object. Thousands per second on a hidden scene is waste. |

### 2.6 Easing curves in one picture

```text
progress
  1 |        ........----------   expo.out  (fast start, long soft landing)
    |     .''
    |   .'          ___-----      power2.out (softer version)
    |  /       _.-''
    | /    _.-'        ____       none (constant speed: a straight line)
    |/ _.-'     ___.--'
  0 +--------------------------> time
```

Rule of thumb: things that **arrive** use `.out` eases (fast then soft). Things that **leave** use `.in` eases (soft then fast). Scroll-scrubbed moves often use `none`, because the scroll already gives the feel.

---

## 3. What changed

### Pass 1: `/impeccable` (commit `b6759c1`)

#### Item 1. Scroll control ("harden")

**Problem:** A small upward scroll at Studio played the whole break backwards. Glides locked out all input. Arrow keys jumped whole Pages and skipped the Run.

**Changes:**

1. **A rewind needs intent.** [src/storyNavigation.js:12](../src/storyNavigation.js#L12) and [line 565](../src/storyNavigation.js#L565).

   ```js
   const DEFAULT_REWIND_THRESHOLD_PX = 120   // upward scroll must add up to 120 px
   const DEFAULT_REWIND_MEMORY_MS = 800      // separate flicks add up if they come within 0.8 s
   ...
   rewindIntent.accumulated += Math.abs( delta )
   if ( rewindIntent.accumulated < rewindThresholdPx ) return false   // hold still, no rewind yet
   ```

   *Why:* Trackpads keep sending small events after you lift your fingers ("inertia"). A 14 px threshold caught those by accident.

2. **Scrolling against a glide takes the page back.** [storyNavigation.js:587](../src/storyNavigation.js#L587) (`readReversal`) and [line 615](../src/storyNavigation.js#L615) (`interruptGlide`). Inside the break, the glide turns around. Anywhere else it stops, and the page scrolls freely.

3. **Stopping Lenis mid-glide.** [src/storyNavigationBrowser.js:201](../src/storyNavigationBrowser.js#L201).

   ```js
   const cancelGlide = () =>
   {
     if ( lenis ) { if ( !lenis.isStopped ) { lenis.stop(); lenis.start() } return }
     eventTarget.scrollTo( { top: eventTarget.scrollY, left: 0, behavior: 'auto' } )
   }
   ```

   *Why:* `lenis.scrollTo(currentPosition)` does nothing during a glide (Lenis thinks it is already there). `stop()` then `start()` resets Lenis's animation cleanly using only its public API.

4. **Keys.** Arrows and Space now scroll natively; PageUp, PageDown, Home, End jump by Page. On the Intro, arrows and Space play the break ([storyNavigation.js:679](../src/storyNavigation.js#L679)). Space on a focused button presses the button ([line 712](../src/storyNavigation.js#L712)).

5. **Faster rewind.** [src/hooks/useStoryPager.js:9](../src/hooks/useStoryPager.js#L9): `REWIND_SECONDS = 1` (was 1.6).

#### Item 2. Handoff colours ("the Sheet Rule")

**Problem:** Colours changed with the scroll, so halfway through a Handoff the rising sheet was grey (between ink and paper) and Contact was olive.

**Changes:**

- The scroll-driven colour mix was deleted. Each Page's wall now has one fixed colour. [src/looks/acid.css:262](../src/looks/acid.css#L262):

  ```css
  /* Projects is a paper sheet from its first pixel */
  .experience[data-look='acid'] .projects-screen .cyc-wall {
    background: radial-gradient(...), var(--an-paper);
  }
  ```

- The flat dark wash over Contact became a soft shadow only under Projects' bottom edge. [src/styles.css:691](../src/styles.css#L691):

  ```css
  .contact-shade {
    --edge-shadow: linear-gradient(to bottom, #000 0%, rgb(0 0 0 / 0.55) 7%, ... transparent 34%);
    mask-image: var(--edge-shadow);   /* only the top third darkens */
    opacity: 0;                       /* GSAP fades this from 0.4 to 0 as Projects leaves */
  }
  ```

  *Technique:* a **mask** is a stencil. The gradient is solid at the top and clear by 34% down, so the shadow hugs the edge like a real sheet lifting off a surface. Only `opacity` animates, which is cheap.

- The strength is `contactShade: 0.4` in [src/motion/flowMotion.js:12](../src/motion/flowMotion.js#L12), scaled by the **depth** dial.

#### Item 3. The first two seconds ("opening shot")

**Problem:** The loading cover lifted onto a still picture.

**Changes** (built by the other Claude session):

- New file [src/motion/introEntrance.js](../src/motion/introEntrance.js). Timings at [line 8](../src/motion/introEntrance.js#L8):

  ```js
  const SHOT = Object.freeze( {
    pushIn: 1.06,        // the table starts 6% too big, then settles to 100%
    settleSeconds: 2.4,
    wordsAt: 0.35,       // words start rising 0.35 s after the cover starts lifting
    wordSeconds: 1,
    wordStagger: 0.08,   // each word 0.08 s after the one before
    servicesAt: 0.6,
    promptAt: 1,
  } )
  ```

- Each word sits in a mask: [line 61](../src/motion/introEntrance.js#L61) `clipPath: 'inset(-100% -100% 0% -100%)'` hides everything below the word's line, and each word rises from `yPercent: 110` to `0` with `ease: 'power4.out'`. This is the classic "line reveal" on award-winning sites.
- The Preloader calls `onReveal` when the cover starts to lift ([src/components/Preloader.jsx:107](../src/components/Preloader.jsx#L107)).
- [index.html:8](../index.html#L8): `<style>html { background: #07110d; }</style>` so the very first frame is night-green, never white.

#### Item 4. Performance ("optimize")

Measured on a production build, before and after:

| Measure | Before | After |
|---|---|---|
| First-load size | 1,791 KB | 671 KB |
| Hidden 3D draws while the pointer moves (3 s) | about 11,500 | 0 |
| Style recalc while the pointer moves (3 s) | about 750 ms | about 90 ms |

**Changes:**

1. **Stop drawing a scene nobody can see.** [src/drafts/PoolPovDraft.jsx:462](../src/drafts/PoolPovDraft.jsx#L462):

   ```js
   isActive: () => isActive && progress < STAGE.intro.draft1.exitEnd,
   ```

   The pointer parallax (the 3D camera following your mouse) now only asks for new frames while the table is visible. Draft 2 has the same gate at [PhotorealPoolDraft.jsx:382](../src/drafts/PhotorealPoolDraft.jsx#L382).

2. **Build Draft 2 only when chosen.** [PhotorealPoolDraft.jsx:395](../src/drafts/PhotorealPoolDraft.jsx#L395) `const build = () => ...` runs on first selection. This is **lazy loading**: 1 MB of walnut wood textures no longer load for visitors who never pick Draft 2.

3. **Write the pointer light only where it is read.** [src/looks/lookRegistry.js:45](../src/looks/lookRegistry.js#L45) names the reader per Look; [src/App.jsx:556](../src/App.jsx#L556) collects them:

   ```js
   keyLight: '.title-screen > .cyc-wall',   // Main: only Studio's wall reads --lx / --ly
   ...
   const keyLightTargets = look.keyLight ? gsap.utils.toArray( look.keyLight, root ) : []
   ```

   *Why:* A custom property set on the root element makes the browser re-style the whole page every frame. Set on one element, it re-styles only that element.

4. **One font, not two.** [src/drafts/poolSurfaceTextures.js:91](../src/drafts/poolSurfaceTextures.js#L91): the numbers on the 3D balls use Space Grotesk (already loaded) instead of Archivo (88 KB extra).

#### Item 5. Controls ("adapt")

- The Draft pills show only while you are settled on the Intro. [src/styles.css:1650](../src/styles.css#L1650):

  ```css
  .experience:is(:not([data-story-indicator-page='intro']), [data-story-state='transitioning']) .draft-switcher {
    opacity: 0;
    visibility: hidden;   /* also removes it from Tab order */
  }
  ```

  *Technique:* the page root carries **data attributes** (`data-story-indicator-page`, `data-story-state`) that JavaScript updates. CSS reads them. JavaScript does not need to touch the pills.

- Every control is at least 44 × 44 px on touch screens: `@media (pointer: coarse)` at [src/styles.css:1716](../src/styles.css#L1716).
- The Look select moved into Contact's foot line ([src/components/LookSwitcher.jsx](../src/components/LookSwitcher.jsx)).

#### Item 6. Polish

- New layout rules for short, wide screens (phones on their side, 200% zoom). They start at [src/looks/acid.css:637](../src/looks/acid.css#L637). Titles there size from the screen **height** with `svh` units (`clamp(40px, 16svh, 96px)`), so they never collide with the cards or the footer.

### Pass 2: `/taste-skill` premium pass (commit `a0f07f0`)

#### Visitors see one site

[src/App.jsx:36](../src/App.jsx#L36):

```js
const REVIEW_REQUESTED = ... new URLSearchParams( window.location.search ).has( 'review' )
...
{ REVIEW_REQUESTED && <DraftSwitcher ... /> }
```

The Draft and Look pickers now appear only with `?review` in the address. Visitors see Main with Draft 01. `?draft=` and `?look=` still work.

#### One name for contact, one primary action

- [src/App.jsx:146](../src/App.jsx#L146) `PRIMARY_CONTACT`: WhatsApp is the one big action ("Message us on WhatsApp", a full-width ink bar). Styles at [src/styles.css:2015](../src/styles.css#L2015).
- Instagram and email are smaller links under it.
- Every way to reach the studio is labelled "Contact us" (the header, the closing board).

*Why:* Premium sites make one clear next step. Many labels with the same meaning ("Start a project", "Let's talk", "Contact us") make people hesitate.

#### Calmer motion

1. **Skew only on the cards, and never during a glide.** The dial is now `1.5` ([storyTiming.js:14](../src/storyTiming.js#L14)). The titles and Contact lost their `skew-layer` class. [src/motion/velocitySkew.js:41](../src/motion/velocitySkew.js#L41):

   ```js
   const gliding = root.dataset.storyTransitioning === 'true'
   leanTo( gliding ? 0 : skewFromVelocity( getVelocity(), { gain: GAIN, maxDeg: getTuning().skew } ) )
   ```

   *Velocity skew* means: the faster you scroll, the more the cards lean, like a flag in wind. It should feel like your hand; during an automatic glide it would feel like a glitch.

2. **Glides use an expo ease-out, and longer trips take longer.** [src/hooks/useStoryPager.js:35-66](../src/hooks/useStoryPager.js#L35):

   ```js
   duration: Math.min( 1.5, 0.7 + 0.14 * screens ),          // 0.7 s + 0.14 s per screen, max 1.5 s
   easing: easeGlideOut,
   ...
   const easeGlideOut = ( t ) => ( t >= 1 ? 1 : 1 - Math.pow( 2, -10 * t ) )   // expo.out
   ```

   Before, every glide took 1.2 s with a symmetric ease (slow start, slow end), so short hops felt sluggish.

3. **Top, the wordmark and Home are a cut.** [src/App.jsx:946](../src/App.jsx#L946):

   ```js
   gsap.timeline()
     .to( cover, { autoAlpha: 1, duration: 0.28, ease: 'power2.in' } )     // night fades up
     .call( () => goToPage( 'intro', { immediate: true } ) )               // jump, unseen
     .to( cover, { autoAlpha: 0, duration: 0.6, ease: 'power2.out' }, '+=0.12' )  // fade away
   ```

   The cover is `.cut-cover` ([src/styles.css:2142](../src/styles.css#L2142)). The Home key uses the same cut ([App.jsx:962](../src/App.jsx#L962)). In film this is a "dip to black". Before, going to the top glided backwards through the whole break, which looked like a glitch.

#### The closing shot

Markup at [src/App.jsx:1186](../src/App.jsx#L1186); animation at [src/motion/flowMotion.js:221](../src/motion/flowMotion.js#L221):

```js
gsap.timeline( { scrollTrigger: { trigger: contact, start: 'top 70%', end: 'top 2%', scrub } } )
  .fromTo( ball, { xPercent: -520, rotation: -540 }, { xPercent: 0, rotation: 0, duration: 0.7, ease: 'power2.out' } )  // roll in
  .to( ball, { scale: 0.64, filter: 'brightness(0.55)', duration: 0.3, ease: 'power2.in' } )                      // drop in
```

- *Rolling:* moving right while turning clockwise (`rotation` from -540 to 0 degrees = one and a half turns).
- *Dropping:* getting smaller and darker reads as "sinking into the pocket".
- *Scrubbed:* the scroll plays it, so scrolling back rolls the ball back out.
- The CSS rest state ([src/styles.css:2089](../src/styles.css#L2089)) is already the final frame (ball in pocket), so with reduced motion the visitor still sees the story's end.

---

## 4. Experiment safely

| Address | What it does |
|---|---|
| `http://localhost:5173/?tune` | Sliders for the six dials. Move one, feel it, then "Copy values" into `src/storyTiming.js`. |
| `?review` | Shows the Draft and Look pickers. |
| `?look=cyc` or `?look=downlight` | Opens another Look. |
| `?draft=photoreal` or `?draft=original` | Opens another Draft. |

Try these to learn the feel:

1. `glide` 0.05 vs 0.2: heavy coast vs snappy.
2. `weight` 0 vs 1.2: animations glued to the scroll vs trailing like heavy objects.
3. `depth` 0 vs 2: flat Handoffs vs dramatic ones.
4. `skew` 0 vs 6: still cards vs wobbly cards. (Most premium sites keep this small.)

Turn on **Reduce motion** in macOS System Settings > Accessibility > Display, reload, and see the calm version of the site.

After any change, run `npm test` (94 tests guard the timing and navigation rules) and `npm run build`.
