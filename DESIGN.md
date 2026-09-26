---
name: 8 Ball Studio
description: Main. After the pool break, the Story runs ink, then paper, then full acid, and every Page moves with a heavy, cinematic scroll.
colors:
  ink: "#070908"
  paper: "#f2f1e9"
  acid: "#b7d95b"
  felt: "#0b5b3b"
  night: "#07110d"
  card: "#ffffff"
typography:
  display:
    fontFamily: "Space Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(60px, 14vw, 224px)"
    fontWeight: 700
    lineHeight: 0.72
    letterSpacing: "-0.075em"
  headline:
    fontFamily: "Space Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(52px, 11vw, 190px)"
    fontWeight: 700
    lineHeight: 0.72
    letterSpacing: "-0.075em"
  intro-display:
    fontFamily: "Space Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(55px, 7.6vw, 118px)"
    fontWeight: 700
    lineHeight: 0.83
    letterSpacing: "-0.06em"
  title:
    fontFamily: "Space Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(16px, 1.4vw, 22px)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Space Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  label:
    fontFamily: "Space Grotesk, Helvetica Neue, Arial, sans-serif"
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

This is the studio's original single look (commit 91fcc52), restored. It pairs near-black ink with warm paper and uses one acid-green signal. Titles are set tight and large; every smaller word is the same face, bold and in sentence case. After the pool break the Story changes palette as it goes. Studio is ink, lit by a faint acid glow. Projects is paper, and its client cards run past like a reel. Contact is full acid, so the one next step is the loudest surface on the site. Each Page is a sheet in its own colour, and the palette changes at a sheet's edge as it slides over or lifts off the one below, like a cut in film.

Density is low. Each Page holds one enormous title and one next move. Motion carries the brand: the studio sells video, so how the site moves is the demonstration.

**Key Characteristics:**
- Three palettes on one Story: ink → paper → acid, each on its own sheet, changing at the sheet's edge.
- Space Grotesk 700 caps pulled tight (−0.075em, line-height 0.72), with the second line indented 15vw and set in the signal colour.
- One face for everything: Space Grotesk 700 in sentence case, 13–15px, for nav, services, captions, controls, and counts.
- Thin orbit rings behind Studio, on the ink only; no other ornament.
- A smooth glide (Lenis lerp 0.1) with a short animation lag, every Page choreographed to it.

## Colors

- **Ink** (`#070908`): Studio's ground, and the type on paper and acid. It is also the fill for control pills and the Instagram card.
- **Paper** (`#f2f1e9`): Projects' ground. It is also the type on ink.
- **Acid** (`#b7d95b`): the signal colour. It is Contact's ground, and marks the second title line on ink, the service numbers, and the Contact card. On ink it is decoration and emphasis; on paper it never carries text.
- **Felt** (`#0b5b3b`): the indented title line on paper and acid, where acid would vanish. It is also the nav accent there.
- **Night** (`#07110d`): the page ground and preloader behind the Intro.
- **Card** (`#ffffff`): client cards on paper.

### Named Rules
**The Signal Rule.** Acid is the one colour off the ink/paper axis. Felt stands in for it wherever acid would lose contrast (on paper and acid grounds).

**The Sheet Rule.** A Page's ground never changes while it moves. Each sheet is its final colour from its first pixel: Projects rises over Studio already paper, and Contact is uncovered already acid. The palette changes only at a sheet's edge, so a Handoff never shows a mid-tone between two palettes. Depth comes from the layer below (Studio shrinks and dims) and from the soft shadow a sheet casts at its edge. Only the header ink and the browser chrome change colour, as each section reaches the header line.

**The Header Rule.** The header follows the section under it: paper ink over the stage, ink over Projects and Contact. The browser chrome (`<meta name="theme-color">`) follows it too.

## Typography

**Every word:** Space Grotesk (self-hosted variable, 300–700). Small text reads the `--ui-*` tokens in `src/styles.css`, which each look points at its own title face.

- **Display** (700, clamp(60px, 14vw, 224px), line-height 0.72, tracking −0.075em, caps): "8 BALL / STUDIO". Each line is a mask the letters rise out of.
- **Headline** (the same face and setting, clamp(52px, 11vw, 190px)): Projects and Contact titles.
- **Intro display** (700, clamp(55px, 7.6vw, 118px), line-height 0.83, tracking −0.06em, sentence case): "Roll with us." over the pool break.
- **Title** (700, clamp(18px, 1.5vw, 24px), tracking −0.02em): contact channel names.
- **Body** (700, 15px, line-height 1.5, tracking −0.01em): the Intro and Studio service lines.
- **Label** (700, 13–15px, tracking −0.01em, sentence case): nav, captions, contact details (500), controls, the cursor label, and the preloader count.

### Named Rules
**The One Face Rule.** Every word is Space Grotesk. Titles are 700 caps at −0.075em; everything smaller is 700 in sentence case at −0.01em (details drop to 500). No second face, no tracked-out caps.

**The Indent Rule.** A two-line title steps its second line in by 15vw (7vw on phones) and sets it in the signal colour. Contact's "US" is the exception: it stays flush.

## Layout

The Story has a pinned stage (Intro, then Studio) followed by two choreographed sections. Content hangs off `--gutter` (clamp(20px, 5vw, 80px); 18px on phones).

- **Studio:** the title is centred on a box min(90vw, 1320px) wide. A footer rule sits near the bottom: numbered services on the left, the location on the right.
- **Projects:** the title sits top-left. A rail at the bottom carries the client cards (7:5) and two closing cards, which run sideways while the section is pinned.
- **Contact:** the title sits top-left, with the pocket holding the 8-ball at top right. Under it: one lead line, the WhatsApp action as a full-width ink bar, then Instagram and email in a ruled two-column list (one column on phones), and a foot line.

The compact breakpoint is `max-width: 768px` or `max-height: 540px`. Safe-area insets are respected on edge controls.

## Elevation & Depth

Depth comes from motion and soft shadow, never from glow. Client cards sit on `0 20px 45px` ink at 8%, deepening to 20% as they cross the centre of the run. As Contact is uncovered, Projects casts a shadow at its bottom edge: ink at 40%, eased to nothing a third of the way down the screen, lifting as Projects leaves. Everything else is flat.

## Shapes

Cards have 4px corners. Controls are pills. Circles are for round things only: the 8-ball, the orbit rings, the contact icon rings, and the cursor ball. Arrows are drawn strokes, never glyphs.

## Components

### Header
The 8-ball mark sits at left. On the right are plain links: Our projects, Contact us (with its arrow), and Top. A hairline in the current nav ink runs under the header. The current Page is underlined in the nav accent (acid on ink, felt on paper and acid).

### Client cards and closing cards (Projects)
Client cards are white and 4px-cornered; HaruPlate's is ink, because its mark is drawn for dark grounds. Each has a small caption underneath. The run ends with two link cards that are next steps, never invented work: "Your brand, next" is cut from acid and opens Contact; "More on Instagram" is cut from ink and opens the studio's real profile.

### Channel list (Contact)
Above the list, WhatsApp is the one primary action: a full-width ink bar with the acid WhatsApp glyph, the label, the number, and an arrow that steps forward on hover. The list below holds Instagram and email, ruled in ink at 24%. Each row has a ringed icon, the channel name, the detail at 500, and an action label with an arrow. On hover or focus the row takes a 7% ink wash and the icon fills ink with an acid glyph.

### Controls
Visitors get no Draft or Look controls: they see Main with Draft 01. The owner picks both in the `?tune` panel (a dev tool, with the scroll-feel sliders), which also writes `?draft=` and `?look=` to the URL. Nothing floats over the Pages but the header.

On touch screens every control is a target of at least 44 × 44 px.

### Cue-ball cursor
This applies to mouse and trackpad only. A small lit ball replaces the pointer and trails it by 0.18 s. Over links it swells; over elements with `data-cursor` it shows the action as a pill ("Message", "Contact"...). On ink the ball is paper with an acid label; on paper and acid it is ink. The system pointer returns over the controls.

### Preloader
It covers the Intro only while the faces and the active Draft load, once per session. The 8-ball rolls in place while a count runs in acid. The count creeps toward 90 and reaches 100 only when everything is ready. The cover then lifts away like a sheet pulled up. On a reload in the same session there is no cover; the Intro simply shows once it is ready.

## Motion

Every look shares this system. Values live in `src/storyTiming.js` (`scroll`, `pages`, `flow`), and a `?tune` panel adjusts them live.

- **Glide:** Lenis lerp 0.1, wheel 0.7, animation lag 0.4 s (0.2 s after Studio). Touch keeps native momentum.
- **Opening shot** (once per page load, as the preloader lifts or the Intro first shows): the active Draft's table settles from a 1.06 push-in (power2.out, 2.4 s); "Roll with us." rises out of its line word by word (power4.out, 1 s, 0.08 s apart), clipped only below the line so its soft shadow is never cut; the services settle under it; the scroll prompt arrives last. It moves only child elements, so the scrubbed Intro timeline keeps `.hero-copy` and `.scroll-prompt`. Reduced motion shows the Intro at rest. Code: `src/motion/introEntrance.js`.
- **Intro → Studio** (pinned, scrub 1.2 s): one scroll plays the whole break by itself, a 3 s glide that starts slowly so the 8-ball rolls in heavy; scrolling up from Studio plays it back. The Studio cue then takes one screen of that glide, so its title lands at the pace of the Projects and Contact titles. Each look has its own reveal. In Main the opening composition fades into Studio while the title letters rise out of their line masks, left to right.
- **Studio → Projects handoff** (scrub 0.6 s): Projects rises over the held Studio, which shrinks to 0.965, lifts 2%, and dims.
- **The run:** Projects pins while its cards slide sideways, and each card lifts as it crosses the centre. The title drifts against the cards for depth.
- **Projects → Contact reveal:** Projects scrolls away and Contact is uncovered from beneath it. Contact is acid from its first pixel. Its content settles from 25% up while the shadow under Projects' edge lifts.
- **Velocity skew:** only the Projects cards lean with the scroll's speed (up to 1.5°) and settle upright. Titles and Contact stand still, and nothing leans during a glide.
- **Glides:** header links and Page keys glide on a quart ease-out, 0.7 s plus 0.14 s per screen (at most 1.5 s). Top, the wordmark and Home return to the Intro as a cut, never a rewind.
- **Closing shot:** as Contact settles, the 8-ball rolls in from the left and drops into the pocket beside the title, the break's last beat. At rest, and with reduced motion, it lies in the pocket.
- **Reduced motion:** there is no Lenis, skew, run, or handoff. Each Page shows its own palette, and the cards wrap into a grid.

## Alternate looks

**Cyc Wall** (`src/styles.css`) is a photo-studio floor. After the break, the lights come up on an infinity cove relit by one saturated gel per Page: pink Studio, teal Projects, amber Contact. Titles are gaffer-black extra-condensed Archivo cut-outs (small text is Archivo 700 at 85% width), and their cast shadows follow the pointer as the key light. Every label is paper tape, and the Studio cue is a circle of gel light flooding from the pocket. In the run, the boards stand up on their feet as they cross the key light.

**Pool Table** (`src/looks/downlight.css`, id `downlight`) is the table seen from the lamp. Every Page is the bed under a rectangular downlight, with walnut rails, six pockets, and the hall black beyond. Every word is Schibsted Grotesk in ivory (titles 860, small text 700); nav links are led by their balls, and the services are the 1, 2, and 3 balls. The Studio cue is the canopy light opening. In the run, the cards slide under the rails and rise toward the camera as they cross the lamp.

Only Main changes palette per Page. Cyc Wall's Pages already differ by gel, and Pool Table stays on green cloth.

## Do's and Don'ts

### Do:
- **Do** keep acid for the one signal per surface. Use felt wherever acid would sit on paper or acid.
- **Do** give each Page its own ground from its first pixel. Change palette only at a sheet's edge.
- **Do** set titles in Space Grotesk 700 caps at −0.075em, with the second line indented and coloured.
- **Do** set every small word in Space Grotesk 700, sentence case, 13–15px.
- **Do** keep every card and closing board honest: real clients, real channels, real next steps.

### Don't:
- **Don't** add glow edges, gradients or mid-tones between palettes, or neon on ink beyond the one faint acid spot.
- **Don't** invent work, metrics, or clients to fill the run. Use the closing cards instead.
- **Don't** let anything on the pinned stage lean with the velocity skew.
- **Don't** restyle or tokenize the Intro pool-break scenes. Their materials are fixed.
