---
name: 8 Ball Studio
description: Acid Night. After the pool break, the Story runs ink, then paper, then full acid, and every Page moves with a heavy, cinematic scroll.
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
    fontSize: "clamp(13px, 1.05vw, 16px)"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "DM Mono, ui-monospace, monospace"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0.04em"
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

The site ships three **Looks** over one markup and one motion system. **Acid Night** is the default and the system this file describes first. **Cyc Wall** and **Downlight** are alternates, summarised at the end. Their tokens live in `src/styles.css` (Cyc Wall, the base sheet) and `src/looks/downlight.css`. The motion spec is `DOCS/SPEC_FLUID_SCROLL_AND_LOOKS.md`.

## Overview

**Creative North Star: "Acid Night"**

This is the studio's original single look (commit 91fcc52), restored. It pairs near-black ink with warm paper and uses one acid-green signal. Type is set tight and large; labels are set small, like a monospace slate. After the pool break the Story changes palette as it goes. Studio is ink, lit by a faint acid glow. Projects is paper, and its client cards run past like a reel. Contact is full acid, so the one next step is the loudest surface on the site. Palettes morph with the scroll rather than cutting, so the page reads as one continuous piece of film.

Density is low. Each Page holds one enormous title and one next move. Motion carries the brand: the studio sells video, so how the site moves is the demonstration.

**Key Characteristics:**
- Three palettes on one Story: ink → paper → acid, morphing in oklab with the scroll.
- Space Grotesk 700 caps pulled tight (−0.075em, line-height 0.72), with the second line indented 15vw and set in the signal colour.
- DM Mono for every label: nav, services, captions, controls, counts.
- Thin orbit rings behind the Pages; no other ornament.
- A heavy glide (Lenis lerp 0.05), with every Page choreographed to it.

## Colors

- **Ink** (`#070908`): Studio's ground, and the type on paper and acid. It is also the fill for control pills and the Instagram card.
- **Paper** (`#f2f1e9`): Projects' ground. It is also the type on ink.
- **Acid** (`#b7d95b`): the signal colour. It is Contact's ground, and marks the second title line on ink, the active Draft pill, the service numbers, and the Contact card. On ink it is decoration and emphasis; on paper it never carries text.
- **Felt** (`#0b5b3b`): the indented title line on paper and acid, where acid would vanish. It is also the nav accent there.
- **Night** (`#07110d`): the page ground and preloader behind the Intro.
- **Card** (`#ffffff`): client cards on paper.

### Named Rules
**The Signal Rule.** Acid is the one colour off the ink/paper axis. Felt stands in for it wherever acid would lose contrast (on paper and acid grounds).

**The Morph Rule.** Palettes never cut. Section surfaces take `--theme-bg`, mixed in oklab from `--theme-t` (0 ink, 1 paper, 2 acid). Each change happens inside a short window of its handoff (`easeThemeMorph`), so the midpoint grey only flashes past. Each section's ink stays fixed, so its type develops as its ground arrives.

**The Header Rule.** The header follows the section under it: paper ink over the stage, ink over Projects and Contact. The browser chrome (`<meta name="theme-color">`) follows it too.

## Typography

**Display, headline, intro, and body:** Space Grotesk (self-hosted variable, 300–700).
**Labels:** DM Mono (self-hosted 300, 400, 500).

- **Display** (700, clamp(60px, 14vw, 224px), line-height 0.72, tracking −0.075em, caps): "8 BALL / STUDIO". Each line is a mask the letters rise out of.
- **Headline** (the same face and setting, clamp(52px, 11vw, 190px)): Projects and Contact titles.
- **Intro display** (700, clamp(55px, 7.6vw, 118px), line-height 0.83, tracking −0.06em, sentence case): "Roll with us." over the pool break.
- **Title** (600, clamp(16px, 1.4vw, 22px)): contact channel names.
- **Body** (400, clamp(13px, 1.05vw, 16px), line-height 1.5): the Intro service lines.
- **Label** (DM Mono 400, 9–11px, tracking 0.04–0.08em, caps): every label and control.

### Named Rules
**The Two Voices Rule.** Every word is either Space Grotesk (things you read) or DM Mono (things you operate or scan). No third face.

**The Indent Rule.** A two-line title steps its second line in by 15vw (7vw on phones) and sets it in the signal colour. Contact's "US" is the exception: it stays flush.

## Layout

The Story has a pinned stage (Intro, then Studio) followed by two choreographed sections. Content hangs off `--gutter` (clamp(20px, 5vw, 80px); 18px on phones).

- **Studio:** the title is centred on a box min(90vw, 1320px) wide. A footer rule sits near the bottom: numbered services on the left, the location on the right.
- **Projects:** the title sits top-left. A rail at the bottom carries the client cards (7:5) and two closing cards, which run sideways while the section is pinned.
- **Contact:** the title sits top-left above a ruled three-column list of channels (one column on phones), with a foot line under it.

The compact breakpoint is `max-width: 768px` or `max-height: 540px`. Safe-area insets are respected on edge controls.

## Elevation & Depth

Depth comes from motion and soft shadow, never from glow. Client cards sit on `0 20px 45px` ink at 8%, deepening to 20% as they cross the centre of the run. Control pills float on `0 12px 30px` black at 26%, with a 14px backdrop blur. Everything else is flat.

## Shapes

Cards have 4px corners. Controls are pills. Circles are for round things only: the 8-ball, the orbit rings, the contact icon rings, and the cursor ball. Arrows are drawn strokes, never glyphs.

## Components

### Header
The 8-ball mark sits at left. On the right are DM Mono links: Our Projects, Contact Us (with its arrow), and Top. A hairline in the current nav ink runs under the header. The current Page is underlined in the nav accent (acid on ink, felt on paper and acid).

### Client cards and closing cards (Projects)
Client cards are white and 4px-cornered; HaruPlate's is ink, because its mark is drawn for dark grounds. Each has a DM Mono caption underneath. The run ends with two link cards that are next steps, never invented work: "Your brand, next" is cut from acid and opens Contact; "More on Instagram" is cut from ink and opens the studio's real profile.

### Channel list (Contact)
The list is ruled in ink at 24%. Each row has a ringed icon, the channel in Space Grotesk 600, the detail in DM Mono, and an action label with an arrow. On hover or focus the row takes a 7% ink wash and the icon fills ink with an acid glyph.

### Controls
The Draft switcher and the Look dropdown are dark pills. The active Draft is filled acid.

### Cue-ball cursor
This applies to mouse and trackpad only. A small lit ball replaces the pointer and trails it by 0.18 s. Over links it swells; over elements with `data-cursor` it shows the action as a pill ("Message", "Contact"...). On ink the ball is paper with an acid label; on paper and acid it is ink. The system pointer returns over the controls.

### Preloader
It covers the Intro only while the faces and the active Draft load, once per session. The 8-ball rolls in place while a DM Mono count runs in acid. The count creeps toward 90 and reaches 100 only when everything is ready. The cover then lifts away like a sheet pulled up.

## Motion

Every look shares this system. Values live in `src/storyTiming.js` (`scroll`, `pages`, `flow`), and a `?tune` panel adjusts them live.

- **Glide:** Lenis lerp 0.05, wheel 0.8. Touch keeps native momentum.
- **Intro → Studio cue** (pinned, scrub 1.2 s): each look's own reveal. In Acid Night the opening composition fades into Studio while the title letters rise out of their line masks, left to right.
- **Studio → Projects handoff** (scrub 0.6 s): Projects rises over the held Studio, which shrinks to 0.965, lifts 2%, and dims.
- **The run:** Projects pins while its cards slide sideways, and each card lifts as it crosses the centre. The title drifts against the cards for depth.
- **Projects → Contact reveal:** Projects scrolls away and Contact is uncovered from beneath it. Contact's content settles from 25% up while Projects' shadow lifts.
- **Velocity skew:** everything in flow leans with the scroll's speed (up to 4°) and settles upright. The pinned stage never leans.
- **Reduced motion:** there is no Lenis, skew, run, handoff, or morph. Each Page shows its own palette, and the cards wrap into a grid.

## Alternate looks

**Cyc Wall** (`src/styles.css`) is a photo-studio floor. After the break, the lights come up on an infinity cove relit by one saturated gel per Page: pink Studio, teal Projects, amber Contact. Titles are gaffer-black extra-condensed Archivo cut-outs, and their cast shadows follow the pointer as the key light. Every label is paper tape, and the Studio cue is a circle of gel light flooding from the pocket. In the run, the boards stand up on their feet as they cross the key light.

**Downlight** (`src/looks/downlight.css`) is the table seen from the lamp. Every Page is the bed under a rectangular downlight, with walnut rails, six pockets, and the hall black beyond. Type is Schibsted Grotesk in ivory; nav links are led by their balls, and the services are the 1, 2, and 3 balls. The Studio cue is the canopy light opening. In the run, the cards slide under the rails and rise toward the camera as they cross the lamp.

Only Acid Night changes palette per Page. Cyc Wall's Pages already differ by gel, and Downlight stays on green cloth.

## Do's and Don'ts

### Do:
- **Do** keep acid for the one signal per surface. Use felt wherever acid would sit on paper or acid.
- **Do** morph palettes with the scroll. Never cut between them.
- **Do** set titles in Space Grotesk 700 caps at −0.075em, with the second line indented and coloured.
- **Do** put every label in DM Mono.
- **Do** keep every card and closing board honest: real clients, real channels, real next steps.

### Don't:
- **Don't** add glow edges, gradients between palettes, or neon on ink beyond the one faint acid spot.
- **Don't** invent work, metrics, or clients to fill the run. Use the closing cards instead.
- **Don't** let anything on the pinned stage lean with the velocity skew.
- **Don't** restyle or tokenize the Intro pool-break scenes. Their materials are fixed.
