---
name: 8 Ball Studio
description: A photo-studio floor. After the pool break in the dark hall, the lights come up on an infinity cove relit by a new gel on each Page.
colors:
  gel-studio: "#ef3f86"
  gel-studio-deep: "#7a0d3c"
  gel-projects: "#16a597"
  gel-projects-deep: "#054a42"
  gel-contact: "#f59e1b"
  gel-contact-deep: "#8a4800"
  gaffer: "#17171a"
  gaffer-soft: "#46454b"
  cyc: "#eceae4"
  sheet: "#f7f6f2"
  tape: "#f4f2eb"
  hall: "#0a0e0c"
typography:
  display:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(76px, 17.5vw, 290px)"
    fontWeight: 900
    lineHeight: 0.8
    letterSpacing: "0"
    fontVariation: "\"wdth\" 62"
  headline:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(64px, 12.5vw, 214px)"
    fontWeight: 900
    lineHeight: 0.8
    letterSpacing: "0"
    fontVariation: "\"wdth\" 62"
  intro-display:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(64px, 9vw, 148px)"
    fontWeight: 900
    lineHeight: 0.84
    letterSpacing: "0"
    fontVariation: "\"wdth\" 64"
  title:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(22px, 2.1vw, 34px)"
    fontWeight: 850
    lineHeight: 1
    fontVariation: "\"wdth\" 68"
  body:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(13px, 1vw, 15px)"
    fontWeight: 500
    fontFeature: "\"tnum\" 1"
    fontVariation: "\"wdth\" 100"
  label:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "0.05em"
    fontVariation: "\"wdth\" 118"
rounded:
  none: "0px"
  circle: "50%"
spacing:
  tape-x: "13px"
  gap-sm: "12px"
  gap-md: "16px"
  gap-lg: "28px"
  gutter-left: "clamp(20px, 5vw, 80px)"
  gutter-right: "clamp(76px, 8vw, 128px)"
  gutter-compact: "18px"
components:
  tape:
    backgroundColor: "{colors.tape}"
    textColor: "{colors.gaffer}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 13px"
    height: "34px"
  tape-projects:
    backgroundColor: "{colors.gel-projects}"
    textColor: "{colors.gaffer}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 13px"
    height: "40px"
  tape-contact:
    backgroundColor: "{colors.gel-contact}"
    textColor: "{colors.gaffer}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "48px"
  tape-current:
    backgroundColor: "{colors.gaffer}"
    textColor: "{colors.cyc}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
  call-sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.gaffer}"
    rounded: "{rounded.none}"
    padding: "clamp(20px, 2vw, 30px) clamp(18px, 2.2vw, 32px) clamp(10px, 1.2vw, 16px)"
  contact-row:
    textColor: "{colors.gaffer}"
    typography: "{typography.title}"
    padding: "clamp(12px, 1.4vw, 18px) 2px"
  project-board:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.none}"
    width: "min(100%, 250px)"
  project-board-dark:
    backgroundColor: "{colors.gaffer}"
    rounded: "{rounded.none}"
---

# Design System: 8 Ball Studio

## Overview

**Creative North Star: "The Cyc Wall"**

The site is a photo-studio floor. The Intro is a dark pool hall where the break plays; when the ball drops, the lights come up on an infinity cove. Every Page after that is the same painted cyc wall relit by a new saturated gel: pink for Studio, teal for Projects, amber for Contact. Each wall carries a physically motivated hotspot, a shaded cove bend near 66% height, and edge falloff. Nothing sits on the wall that a studio crew would not put there: black silhouette cut-out letters, strips of paper tape, a taped call sheet, sample boards leaning on the floor.

Density is low and theatrical. One Page fills one viewport, holds one enormous gaffer-black title, and gives the visitor one next move. Depth comes from light, not from UI chrome. The wall hotspot and every letter's cast shadow follow the pointer as the key light. Motion carries the brand: each Page arrives as a lighting cue, a clip-path circle of gel flooding from that light's position on one custom "cue" ease.

The build rejects the category default (a near-black page with one neon accent and a card marquee). The dark exists only in the Intro hall, and it ends when the lights come up.

**Key Characteristics:**
- One cyc wall per Page, lit by a single saturated gel with a hotspot, a cove line, and edge falloff.
- Gaffer-black extra-condensed Archivo silhouettes, about 16–17vw, standing on the cove line.
- Paper tape is the only label material: nav, services, captions, the draft switcher, the location.
- The pointer is the key light: it moves the hotspot and the letters' cast shadows.
- A lighting cue on one ease, with a flood origin per Page, carries every Page transition.

## Colors

Three saturated gels on a warm off-white paint and paper world, inked in near-black gaffer. Each Page owns exactly one gel.

### Primary
- **Bright Pink Gel** (gel-studio): the Studio wall. Its deep partner, **Pink Shadow** (gel-studio-deep), is only for shading the pink wall: cove bend, edge falloff, cast and contact shadows.

### Secondary
- **Teal Gel** (gel-projects): the Projects wall, and the "Our Projects" nav tape. Its deep partner is **Teal Shadow** (gel-projects-deep).

### Tertiary
- **Amber Gel** (gel-contact): the Contact wall, the "Contact Us" nav tape, and the highlighter swipe on call-sheet channel names (72% mix). Its deep partner is **Amber Shadow** (gel-contact-deep).

### Neutral
- **Gaffer Black** (gaffer): silhouette titles, body ink, contact icon rings, the call-sheet rule, and the re-cut "current page" tape.
- **Soft Gaffer** (gaffer-soft): secondary ink on paper only (contact details, call-sheet foot). 7.9:1 on sheet.
- **Cyc Paint** (cyc): the painted cove's base value. Also the pale ink over the dark Intro and on gaffer tape.
- **Call-Sheet Paper** (sheet): the call sheet and client boards.
- **Paper Tape** (tape): the default tape fill.
- **Dark Hall** (hall): the page ground before the lights come up. It appears only behind the Intro.

### Named Rules
**The One Gel Rule.** A Page is lit by one gel. The wall, its shading, and its shadows all come from that gel and its deep partner, mixed in oklab. A second gel appears on the Page only as a nav tape that points to the Page it lights.

**The Shadow Is the Gel Rule.** Shadows on a lit wall are never neutral grey. Cast, contact, and call-sheet shadows use the current gel-deep through `color-mix`. That is what light does on coloured paint.

**The Re-cut Rule.** The nav tape for the Page you are on is re-cut in gaffer with cyc ink, so it never disappears into its own gel.

## Typography

**Display Font:** Archivo (self-hosted variable, 100–900 weight, 62–125% width; Helvetica Neue, Arial fallback)
**Body Font:** Archivo (same file)

**Character:** One variable family stretched to both ends. Titles are extra-condensed black silhouettes that read as cut-outs standing in front of the wall. Labels are expanded caps set small, the way a crew writes on tape. The canvas ball numbers in the Intro scenes are set in the same face (700).

### Hierarchy
- **Display** (900, width 62%, clamp(76px, 17.5vw, 290px), line-height 0.8, uppercase): the Studio name "8 BALL / STUDIO", two lines standing on the cove line.
- **Headline** (900, width 62%, clamp(64px, 12.5vw, 214px), line-height 0.8, uppercase): Projects and Contact Page titles. Contact runs slightly smaller (clamp(64px, 11vw, 190px)). On compact screens all cyc titles move to about 21–25vw.
- **Intro Display** (900, width 64%, clamp(64px, 9vw, 148px), line-height 0.84, uppercase, cyc ink): the Intro overlay line over the dark hall. It carries a soft dark text-shadow for legibility over the photographic plate.
- **Title** (850, width 68%, clamp(22px, 2.1vw, 34px), line-height 1, uppercase): call-sheet channel names.
- **Body** (500, width 100%, clamp(13px, 1vw, 15px), tabular numerals): contact details and the Intro service line (clamp(14px, 1.1vw, 17px)).
- **Label** (650, width 118%, 11px, letter-spacing 0.05em, uppercase, line-height 1): every tape. Related small caps (call-sheet foot 600, row actions 750) share width 118% and 0.06em tracking. Floor tapes scale up to clamp(11px, 0.95vw, 14px). The Contact tape is 12.5px.

### Named Rules
**The Two Widths Rule.** Width carries the hierarchy. Titles are condensed (62–68%) and labels are expanded (118%). Body sits at 100%. No other widths are used.

**The Silhouette Rule.** Cyc titles are gaffer black, weight 900, uppercase, zero tracking, split into per-letter spans. They are never outlined, gradient-filled, or recoloured.

## Layout

One sticky full-viewport stage (100svh) holds every Page. Scroll distance drives a single master timeline, and each Page is an absolutely positioned layer. Content hangs off symmetric gutters (clamp(20px, 5vw, 80px) on desktop, 18px on phones); there is no page indicator, the header tapes and keyboard carry navigation. The header runs across the top: the logo at left and the tape nav at right, with 20px vertical and clamp(18px, 3vw, 40px) horizontal padding.

Placement follows the cove. The Studio title's baseline sits at about 66% height (bottom: 34%), and the service tapes sit on the floor at 71%. The Projects title sits top-left, with four client boards on a floor grid (4 columns, gap clamp(16px, 2.4vw, 40px), bottom 13vh). Contact is a two-column grid (1fr / 0.95fr): the title at top-left and the call sheet at bottom-right.

Compact breakpoint (max-width 768px or max-height 540px): both gutters become 18px. Studio tapes stack vertically. Project boards go to 2 columns at 4:3. Contact goes to a single column. Spike tooltips hide. Short landscape (max-height 540px, landscape) restores rows and uses a 1fr / 1.2fr contact grid. Safe-area insets are respected on every edge element.

## Elevation & Depth

Depth is light-motivated, never decorative. The wall itself is a three-layer gradient: a hotspot at the pointer, the cove bend, and edge falloff. Objects on it cast shadows the way real ones would. Letters throw a three-step shadow away from the key light. Boards and the Studio name rest on soft elliptical contact shadows. Tape sits almost flush, with a tight 1px shadow plus a short soft drop. Paper lifts toward the pointer on hover.

### Shadow Vocabulary
- **Tape rest** (`0 1px 1px rgb(0 0 0 / 0.16), 0 7px 14px -8px rgb(0 0 0 / 0.5)`): every tape strip at rest.
- **Tape lift** (`0 1px 1px rgb(0 0 0 / 0.16), 0 14px 18px -9px rgb(0 0 0 / 0.55)`): interactive tape on hover or focus, with a 2px rise.
- **Key-light cast** (three text-shadows at 0.3×, 0.75×, and 1.6× the cast vector; 1px, 6px, and 26px blur; gel-deep at 62%, 34%, and 18%): cyc title letters. The cast vector is derived from the pointer (--lx, --ly).
- **Floor contact** (radial gradient ellipse, gel-deep at 60–70%, 3–4px blur): under the Studio name and under each client board.
- **Call sheet** (`0 2px 2px rgb(0 0 0 / 0.1), 0 34px 40px -24px` gel-deep at 85%): paper taped to the wall.
- **Board foot** (`inset 0 -10px 18px -12px rgb(0 0 0 / 0.18), 0 1px 1px rgb(0 0 0 / 0.14)`): the face of a leaning board.

### Named Rules
**The Key Light Rule.** Every shadow on a lit wall must be explainable by the key light or the floor. Letter shadows move opposite the pointer. Contact shadows sit where an object touches the floor.

## Shapes

Everything a crew would cut is rectangular with square corners (0px): tape, boards, and the call sheet. Rectangles rest at small tilts (tape -1.2°, 0.9°, -0.4° by position; the call sheet 0.6°). Tape ends are slightly darkened to read as torn overlaps. Circles appear only where the world is round: the 8-ball logo, the contact icon rings (1.5px gaffer stroke), and contact-shadow ellipses. Icons are 1.6–1.7px round-capped line SVGs. Arrows are drawn strokes and never glyphs.

## Components

### Paper Tape
The single label material, used for every label and control.
- **Shape:** square-cornered strip (0px), min-height 34px (40px in the header, 48px for Contact), 13px side padding, a resting tilt from the independent `rotate` property.
- **Fill:** paper tape with gaffer ink by default. Nav tapes are cut from the gel of the Page they lead to (teal for Projects, amber for Contact). The current Page's tape, the location tape, and the active draft are re-cut in gaffer with cyc ink.
- **Hover / Focus:** interactive tape rises 2px and its shadow deepens (200ms, ease-out). The Contact arrow slides 4px.
- **Entrance:** slapped on. It starts 1.14× scale, rotated 7°, and invisible, then settles to rest on back.out(2.2), staggered 0.07.

### Call Sheet (Contact)
- **Container:** sheet paper at 0px corners, 0.6° tilt, with a gel-tinted drop shadow and a 2px gaffer rule above the foot line.
- **Rows:** a 36px circular icon, the channel name in the Title style, detail in Soft Gaffer body, and an action label with an arrow. A 1px gaffer rule at 16% separates rows.
- **Hover / Focus:** an amber highlighter swipe grows across the channel name (background-size 0 → 100%, 360ms), and the arrow slides 5px. The focus outline is gaffer with a 2px offset.
- **Compact:** the icon spans two rows, the action label hides, and the arrow remains.

### Client Board (Projects)
- **Shape:** a square sheet-paper board (4:3 on compact) leaning back 7–14° on its foot, at a slight depth scale (0.86–1). A floor contact shadow sits under it. A logo drawn for dark grounds gets a gaffer board.
- **Hover:** the board lifts 8px and its siblings drop a stop (brightness 0.84, saturate 0.9), over 360ms.
- **Entrance:** stood up from rotationX -70° on its foot, on the cue ease.
- **Caption:** a paper tape beneath each board.

### Navigation
The header is the 42px circular 8-ball logo (34px on compact) at left, which returns to the Intro. The tape nav sits at right: Our Projects, Contact Us with an arrow, and Top. Chrome ink (--ink) is cyc over the Intro and switches to gaffer once a cyc is lit. The focus outline is 2px in --ink with a 4px offset.

### Lighting Cue (signature motion)
- **Ease:** one CustomEase "cue" (`M0,0 C0.14,0.66 0.24,1 1,1`): a fast rise with a long tail, like a tungsten head reaching full output. CSS transitions use `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Flood:** each Page's screen reveals through `clip-path: circle(0% → 150%)` from its own light: Studio from the pocket at 88% 27%, Projects from a side key at 6% 32%, and Contact from a footlight at 50% 104%. The wall warms from brightness 0.4 to 1 over the same span. The Page underneath switches off only after the new light owns the frame.
- **Silhouettes:** letters enter from the direction of their Page's light. Studio enters from the right (xPercent 70, skew -14°, from the end). Projects enters from the left (xPercent -80, skew 12°). Contact rises from the floor (scaleY 0.4 from the base, staggered from the centre).
- **Key light:** on fine pointers, a proxy eases toward the pointer (0.9s, power3.out) and writes --lx/--ly. CSS turns these into the hotspot position and the cast vector.
- **Reduced motion:** nothing travels. Pages switch on fully lit, and the key light stays at rest (30%, 26%).

### Fixed Constraint: Intro Pool-Break Scenes
The three Intro Drafts (3D POV, 3D Break, Original) are preserved legacy material. Their felt green, walnut, photographic plate, vignettes, and table styling sit outside this token system and are not to be restyled or tokenized. The system meets them in two places: the dark hall ground and the Studio cue flooding out of the pocket the 8-ball drops into.

## Do's and Don'ts

### Do:
- **Do** light each Page with one gel and shade it only with that gel's deep partner, mixed in oklab.
- **Do** make every label a strip of paper tape: square corners, expanded 118% caps, a small resting tilt, and the tape-rest shadow.
- **Do** set titles as gaffer-black Archivo at weight 900 and 62% width, uppercase, split per letter so the key light can cast their shadows.
- **Do** tint shadows on a lit wall with the current gel-deep, and put a contact shadow wherever an object meets the floor.
- **Do** bring new Pages in as a lighting cue on the "cue" ease, flooding from a physically plausible light position.
- **Do** re-cut the current Page's nav tape in gaffer so it stays visible on its own gel.
- **Do** keep secondary ink on paper at Soft Gaffer or darker.

### Don't:
- **Don't** return to a near-black page with one neon accent and a card marquee. Dark belongs only to the Intro hall.
- **Don't** put two gels on the wall at once or add a gradient between gels. Two lights share the frame only mid-cue, while one flood covers the other.
- **Don't** use neutral grey or hard offset shadows on a lit wall. Every shadow must come from the key light or the floor.
- **Don't** round the corners of tape, boards, or sheets. Circles are reserved for round objects: the ball, icon rings, and contact ellipses.
- **Don't** add a second typeface or widths outside the condensed and expanded poles.
- **Don't** restyle or tokenize the Intro pool-break scenes. Their materials are fixed.
