# 8 Ball Studio Story

This context names the visitor-facing sequence and its visual alternatives so Story decisions stay consistent across architecture work.

## Language

**Story**:
The linear visitor experience that moves through Intro, Studio, Projects, and Contact.
_Avoid_: flow, tour

**Page**:
A named, stable chapter in the Story: Intro, Studio, Projects, or Contact.
_Avoid_: section, screen

**Draft**:
A selectable visual treatment of the Intro page, such as Cinematic, WebGL, or Original.
_Avoid_: version, mode

**Look**:
A whole-site visual theme over the one shared markup and motion: Main (the default), Cyc Wall, or Pool Table. Chosen with `?look=`, or in the Look select in Contact's foot line on `?review` URLs.
_Avoid_: skin, theme (a look's per-Page palettes are its section themes)

**Handoff**:
The scroll-driven move from one Page to the next after the Intro: Projects rising over the held Studio, and Contact uncovered from beneath Projects.
_Avoid_: transition (reserved for Story navigation glides)

**Run**:
The stretch where Projects stays pinned while its boards slide sideways across the screen.
_Avoid_: carousel, marquee

**Stable page**:
The Page that owns the visitor indicator after a navigation transition has settled.
_Avoid_: current screen, destination state

**Story gesture**:
A qualified wheel, touch, or key intent that advances the Story by at most one Page.
_Avoid_: scroll burst, input packet

**Story navigation**:
The rules that turn Story gestures into movement between Stable pages while preserving the visitor's place during transitions and viewport changes.
_Avoid_: scroll controller, paging layer
