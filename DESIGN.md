---
name: 8 Ball Studio
description: Main. After the pool break, the Story runs ink, then black twice, then the pool table under its lamp, and every Page moves with a heavy, cinematic scroll.
colors:
  ink: "#070908"
  paper: "#f2f1e9"
  acid: "#b7d95b"
  felt: "#0b5b3b"
  night: "#07110d"
  card: "#ffffff"
typography:
  display:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(76px, 17vw, 280px)"
    fontWeight: 900
    fontStretch: "62%"
    lineHeight: 0.8
    letterSpacing: "0"
  headline:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(64px, 13vw, 220px)"
    fontWeight: 900
    fontStretch: "62%"
    lineHeight: 0.8
    letterSpacing: "0"
  intro-display:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(64px, 9vw, 148px)"
    fontWeight: 900
    fontStretch: "64%"
    lineHeight: 0.84
    letterSpacing: "0"
  title:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontStretch: "85%"
    fontSize: "clamp(16px, 1.4vw, 22px)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontStretch: "85%"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  label:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontStretch: "85%"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.01em"
rounded:
  none: "0px"
  card: "4px"
  pill: "999px"
  circle: "50%"
spacing:
  gutter: "clamp(20px, 5vw, 80px)"
  gutter-compact: "18px"
  board-gap: "clamp(16px, 2.4vw, 40px)"
  indent: "15vw"
  indent-compact: "7vw"
components:
  nav-link:
    textColor: "{colors.paper}"
    typography: "{typography.label}"
  client-card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.card}"
    width: "clamp(220px, min(24vw, 44svh), 360px)"
  client-card-main:
    backgroundColor: "{colors.ink}"
    logo: "pure white"
    rounded: "{rounded.card}"
  next-card-contact:
    backgroundColor: "{colors.acid}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  next-card-instagram:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.card}"
  control-pill:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    typography: "{typography.label}"
  control-pill-active:
    backgroundColor: "{colors.acid}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
---

# Design System: 8 Ball Studio

The site ships three **Looks** over one markup and one motion system. **Main** is the default and the system this file describes first. **Cyc Wall** and **Pool Table** are alternates, summarised at the end. Their tokens live in `src/styles.css` (Cyc Wall, the base sheet) and `src/looks/downlight.css`. The motion spec is `DOCS/SPEC_FLUID_SCROLL_AND_LOOKS.md`.

## Overview

**Creative North Star: "Main"** (formerly Acid Night; id `acid`)

This is the studio's original single look (commit 91fcc52), restored, now set in the Cyc Wall's face. It pairs near-black ink with warm paper and uses one acid-green signal. Titles are Archivo condensed caps, set large; every smaller word is the same family, bold and in sentence case. After the pool break the Story changes palette as it goes. Studio is ink, lit by a faint acid glow. Services is black, like nickho-motorsports.nl's history timeline: one panel per service, its title on the left and a carousel of its work on the right. Projects is black too, a partner wall after airrlabs.com: no cards, each client's logo alone in pure white, running past like a reel. Contact is the Pool Table look's table under its lamp, in the black hall: the Story ends where the break began. Each Page is a sheet in its own colour, and the palette changes at a sheet's edge as it slides over or lifts off the one below, like a cut in film.

Density is low. Each Page holds one enormous title and one next move. Motion carries the brand: the studio sells video, so how the site moves is the demonstration.

**Key Characteristics:**
- Four grounds on one Story: ink → black → black → the lamp-lit table, each on its own sheet, changing at the sheet's edge.
- Archivo 900 caps at 62% width (line-height 0.8, the Cyc Wall's setting), with the second line indented 15vw and set in the signal colour.
- One family for everything: Archivo 700 at 85% width in sentence case, 13–15px, for nav, services, captions, controls, and counts.
- Thin orbit rings behind Studio, on the ink only; no other ornament.
- A smooth glide (Lenis lerp 0.1) with a short animation lag, every Page choreographed to it.

## Colors

- **Ink** (`#070908`): Studio's ground, and the type on paper and acid. It is also the fill for control pills and the Instagram card.
- **Paper** (`#f2f1e9`): Projects' ground. It is also the type on ink and on felt.
- **Acid** (`#b7d95b`): the signal colour. It marks the second title line on ink and on the Contact cloth, the service numbers and timeline, and the Contact card. On ink it is decoration and emphasis; on paper it never carries text.
- **Felt** (`#0b5b3b`): the indented title line on paper, where acid would vanish, the nav accent there, and the glyphs on Contact's ivory chips.
- **Black** (`#000000`): Services' ground, with a paper hairline at its top edge so it reads as it rises over the ink Studio.
- **Night** (`#07110d`): the page ground and preloader behind the Intro.
- **Projects** (`#000000`): black like Services, the client logos pure white on it, no cards.
- **Hall** (`#030403`) and **Ivory** (`#f3eee2`): Contact's black hall around the Pool Table look's table, and the type on its cloth.

### Named Rules
**The Signal Rule.** Acid is the one colour off the ink/paper axis. Felt stands in for it wherever acid would lose contrast (on paper and acid grounds).

**The Sheet Rule.** A Page's ground never changes while it moves. Each sheet is its final colour from its first pixel: Services rises over Studio already black, Projects rises over Services already black (both with a paper hairline at the edge), and Contact is uncovered already the black hall with its table. The palette changes only at a sheet's edge, so a Handoff never shows a mid-tone between two palettes. Depth comes from the layer below (Studio shrinks and dims) and from the soft shadow a sheet casts at its edge. Only the header ink and the browser chrome change colour, as each section reaches the header line.

**The Header Rule.** Every Page after the break is dark, so the header stays paper ink throughout, on a black bar once the stage releases; the current Page is underlined in acid. The browser chrome (`<meta name="theme-color">`) follows it too.

## Typography

**Every word:** Archivo (self-hosted variable, widths 62–125%), the Cyc Wall's face. Small text reads the `--ui-*` tokens in `src/styles.css`.

- **Display** (900, 62% width, clamp(76px, 17vw, 280px), line-height 0.8, caps): "8IGHTBALL / STUDIO". Each line is a mask the letters rise out of.
- **Headline** (the same setting, clamp(52px, 13vw, 220px) by Page): Services, Projects and Contact titles, and the active service's name in the timeline.
- **Intro display** (900, 64% width, clamp(64px, 9vw, 148px), line-height 0.84, sentence case): "Roll with us." over the pool break.
- **Title** (700, clamp(18px, 1.5vw, 24px), tracking −0.02em): contact channel names.
- **Body** (700, 15px, line-height 1.5, tracking −0.01em): the Intro and Studio service lines.
- **Label** (700, 85% width, 13–15px, sentence case): nav, captions, contact details (500), controls, the cursor label, and the preloader count.

### Named Rules
**The One Face Rule.** Every word is Archivo. Titles are 900 caps at 62% width; everything smaller is 700 at 85% width in sentence case (details drop to 500). No second face, no tracked-out caps.

**The Indent Rule.** A two-line title steps its second line in by 15vw (7vw on phones) and sets it in the signal colour. Contact's "US" is the exception: it stays flush.

## Layout

The Story has a pinned stage (Intro, then Studio) followed by two choreographed sections. Content hangs off `--gutter` (clamp(20px, 5vw, 80px); 18px on phones).

- **Studio:** the title is centred on a box min(90vw, 1320px) wide. A footer rule sits near the bottom: numbered services on the left, the location on the right.
- **Services:** the title sits top-left, with a one-line lead set right ("Six ways we make brands move."). Under it, one panel per service, each a screen tall plus its carousel's run: on the left the name in title caps and its detail; on the right, to the screen's edge, a five-tile reel of 4:5 tiles: motion-led services (video, social, AI) open and close on a clip, craft-led ones (design, web) open on a still, and clips alternate with stills; one shared grade (saturation 0.85, contrast 1.06), baked into the files, unifies the footage. Phones stack each panel: text above, carousel below. Reduced motion shows the ruled list instead.
- **Projects:** the title sits top-left. A rail at the bottom carries the client cards (7:5) and two closing cards, which run sideways while the section is pinned.
- **Contact:** the Pool Table look's table under its lamp, centred in the black hall, horizontal on every screen. On upright screens the camera moves in: the table is sized by its height so the channels fit on the cloth, its ends run off the sides, and the long rails with their middle pockets frame the type; Contact grows taller than the screen when needed. The hall carries the lamp's warm spill, a vignette and a film grain; the cloth a fine worsted grain over the baked nap; the render a touch more contrast and saturation. On the cloth: the title top-left, the lead line, the WhatsApp action as an ivory chip, Instagram and email ruled under it, and a foot line. The 8-ball lies in the table's top-right pocket.

The compact breakpoint is `max-width: 768px` or `max-height: 540px`. Safe-area insets are respected on edge controls.

## Elevation & Depth

Depth comes from motion and soft shadow, never from glow. Client cards sit on `0 20px 45px` ink at 8%, deepening to 20% as they cross the centre of the run. As Contact is uncovered, Projects casts a shadow at its bottom edge: ink at 40%, eased to nothing a third of the way down the screen, lifting as Projects leaves. Everything else is flat.

## Shapes

Cards have 4px corners. Controls are pills. Circles are for round things only: the 8-ball, the orbit rings, the contact icon rings, and the cursor ball. Arrows are drawn strokes, never glyphs.

## Components

### Header
The 8-ball mark sits at left. On the right are plain links: Our services (hidden under 560px wide), Our projects, Contact us (with its arrow), and Top. A hairline in the current nav ink runs under the header. The current Page is underlined in the nav accent (acid on ink, felt on paper and acid).

### Client cards and closing cards (Projects)
There are no client cards: each client is its logo alone, small and pure white on black, like airrlabs.com's partner wall. Logos are flattened to white by a filter; Artigusto's solid badge uses its lettering alone (`artigusto-gelato-white.webp`). A logo runs at half strength and comes up to full as it crosses the centre (full strength on touch screens); the name lives in its alt text, with no caption. Each has a small caption underneath. The run ends with two link cards that are next steps, never invented work: "Your brand, next" is cut from acid and opens Contact; "More on Instagram" is cut from ink and opens the studio's real profile.

### Channel list (Contact)
Laid on the table's cloth in ivory. Above the list, WhatsApp is the one primary action: an ivory chip with a felt WhatsApp glyph, the label, the number, and an arrow that steps forward on hover. The list below holds Instagram and email, ruled in ivory at 18%. Each row has a ringed icon, the channel name (an acid rub on hover), the detail at 500, and an action label with an arrow. On hover or focus the icon fills ivory with a felt glyph.

### Controls
Visitors get no Draft or Look controls: they see Main with Draft 01. The owner picks both in the `?tune` panel (a dev tool, with the scroll-feel sliders), which also writes `?draft=` and `?look=` to the URL. Nothing floats over the Pages but the header.

On touch screens every control is a target of at least 44 × 44 px.

### Cue-ball cursor
This applies to mouse and trackpad only. A small lit ball replaces the pointer and trails it by 0.18 s. Over links it swells; over elements with `data-cursor` it shows the action as a pill ("Message", "Contact"...). After the break every Page is dark, so the ball is paper with an acid label. The system pointer returns over the controls.

### Preloader
It covers the Intro only while the faces and the active Draft load, once per session. The 8-ball rolls in place while a count runs in acid. The count creeps toward 90 and reaches 100 only when everything is ready. The cover then lifts away like a sheet pulled up. On a reload in the same session there is no cover; the Intro simply shows once it is ready.

## Motion

Every look shares this system. Values live in `src/storyTiming.js` (`scroll`, `pages`, `flow`), and a `?tune` panel adjusts them live.

- **Glide:** Lenis lerp 0.1, wheel 0.7, animation lag 0.4 s (0.2 s after Studio). Touch keeps native momentum.
- **Opening shot** (once per page load, as the preloader lifts or the Intro first shows): the active Draft's table settles from a 1.06 push-in (power2.out, 2.4 s); "Roll with us." rises out of its line word by word (power4.out, 1 s, 0.08 s apart), clipped only below the line so its soft shadow is never cut; the services settle under it; the scroll prompt arrives last. It moves only child elements, so the scrubbed Intro timeline keeps `.hero-copy` and `.scroll-prompt`. Reduced motion shows the Intro at rest. Code: `src/motion/introEntrance.js`.
- **Intro → Studio** (pinned, scrub 1.2 s): one scroll plays the whole break by itself, a 3 s glide that starts slowly so the 8-ball rolls in heavy; scrolling up from Studio plays it back. The Studio cue then takes one screen of that glide, so its title lands at the pace of the Projects and Contact titles. Each look has its own reveal. In Main the opening composition fades into Studio while the title letters rise out of their line masks, left to right.
- **Studio → Services handoff** (scrub 0.6 s): Services rises over the held Studio, which shrinks to 0.965, lifts 2%, and dims (except Pool Table, which keeps one still table). The Services title rises in with the look's letter entrance and the six rows settle up one after another.
- **Services panels:** each panel pins (sticky) while its carousel slides sideways 1:1 with the scroll to its last piece; only then does the next panel scroll up over it. The panel's reels play (muted, looped) while it is on screen and pause off it. Code: `createServicePanels` in `src/motion/flowMotion.js`. Sample media: `src/assets/services` (Mixkit, see `SOURCES.json`).
- **Services → Projects handoff:** Projects rises over Services, which shrinks, lifts, and dims the same way.
- **The run:** Projects pins while its cards slide sideways, and each card lifts as it crosses the centre. The title drifts against the cards for depth.
- **Projects → Contact reveal:** Projects scrolls away and Contact is uncovered from beneath it. Contact is the hall and its table from its first pixel. Its content settles from 25% up while the shadow under Projects' edge lifts.
- **Touch screens:** the Projects run and the Services carousels are CSS scroll-driven animations (`view-timeline`, `animation-range: contain`), moved by the browser on the compositor in step with native scrolling; where unsupported they fall back to GSAP locked to the scroll. No velocity skew, per-card lift, title drift or wall push there, and only the panel holding the middle of the screen plays its reels.
- **Velocity skew:** only the Projects cards lean with the scroll's speed (up to 1.5°) and settle upright. Titles and Contact stand still, and nothing leans during a glide.
- **Glides:** header links and Page keys glide on a quart ease-out, 0.7 s plus 0.14 s per screen (at most 1.5 s). Top, the wordmark and Home return to the Intro as a cut, never a rewind.
- **Closing shot:** as Contact settles, the 8-ball rolls in from the left and drops into the table's top-right pocket (the top middle pocket on upright screens), the break's last beat. At rest, and with reduced motion, it lies in the pocket.
- **Reduced motion:** there is no Lenis, skew, run, or handoff. Each Page shows its own palette, and the cards wrap into a grid.

## Alternate looks

**Cyc Wall** (`src/styles.css`) is a photo-studio floor. After the break, the lights come up on an infinity cove relit by one saturated gel per Page: pink Studio, blue Services, teal Projects, amber Contact. Titles are gaffer-black extra-condensed Archivo cut-outs (small text is Archivo 700 at 85% width), and their cast shadows follow the pointer as the key light. Every label is paper tape, and the Studio cue is a circle of gel light flooding from the pocket. In the run, the boards stand up on their feet as they cross the key light.

**Pool Table** (`src/looks/downlight.css`, id `downlight`) is the table seen from the lamp. Every Page is the bed under a rectangular downlight, with walnut rails, six pockets, and the hall black beyond. Every word is Schibsted Grotesk in ivory (titles 860, small text 700); nav links are led by their balls (the 1 for Services), and the Studio services are the 1, 2, and 3 balls. Services lays its running order on the cloth; on the upright phone table only the numbered names show. The Studio cue is the camera rising from the player's eye to the lamp: the top-down table starts laid back like the Intro's view and swings flat while the Intro fades. On wide screens Studio's table keeps the balls where the Draft 1 break left them (`src/looks/breakRest.js`), less the 1, 2, and 3, which the services wear. There is one table under every Page: Studio does not shrink or dim, its type and balls clear off the cloth as Projects' content rises, and Contact's type comes up from under the bottom cushion (`motion.handoff: 'sameTable'`). The closing shot drops the 8-ball into the table's own top-right pocket. In the run, the cards slide under the rails and rise toward the camera as they cross the lamp.

Only Main changes palette per Page. Cyc Wall's Pages already differ by gel, and Pool Table stays on green cloth.

## Do's and Don'ts

### Do:
- **Do** keep acid for the one signal per surface. Use felt wherever acid would sit on paper or acid.
- **Do** give each Page its own ground from its first pixel. Change palette only at a sheet's edge.
- **Do** set titles in Archivo 900 caps at 62% width, with the second line indented and coloured.
- **Do** set every small word in Archivo 700 at 85% width, sentence case, 13–15px.
- **Do** keep every card and closing board honest: real clients, real channels, real next steps.

### Don't:
- **Don't** add glow edges, gradients or mid-tones between palettes, or neon on ink beyond the one faint acid spot.
- **Don't** invent work, metrics, or clients to fill the run. Use the closing cards instead.
- **Don't** let anything on the pinned stage lean with the velocity skew.
- **Don't** restyle or tokenize the Intro pool-break scenes. Their materials are fixed.
