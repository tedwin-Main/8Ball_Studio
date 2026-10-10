# 8 Ball Studio Story

This context names the visitor-facing sequence and its visual alternatives so Story decisions stay consistent across architecture work.

## Language

**Story**:
The linear visitor experience that moves through Intro, Studio, Services, Projects, and Contact.
_Avoid_: flow, tour

**Page**:
A named, stable chapter in the Story: Intro, Studio, Services, Projects, or Contact.
_Avoid_: section, screen

**Draft**:
The Intro page's visual treatment. Only Cinematic remains; `?draft=` values for retired drafts fall back to it.
_Avoid_: version, mode

**Look**:
A whole-site visual theme over the one shared markup and motion. Main is the only one left (the default); retired `?look=` values fall back to it. The `?tune` panel's Design list picks Main's Services layout, or Studio2 (its own page).
_Avoid_: skin, theme (a look's per-Page palettes are its section themes)

**Handoff**:
The scroll-driven move from one Page to the next after the Intro: Services rising over the held Studio, Projects rising over Services, and Contact uncovered from beneath Projects.
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
