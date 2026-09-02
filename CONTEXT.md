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
A selectable visual treatment of the Intro page: Cinematic, WebGL, Original, or the preserved Draft 4 treatment.
_Avoid_: version, mode

**Production Draft**:
The single Intro Draft selected for the public Story after it meets the release standard.
_Avoid_: final version, winning mode

**Fallback Draft**:
The Intro Draft used when the Production Draft cannot present the Story reliably.
_Avoid_: broken mode, low-end version

**Stable page**:
The Page that owns the visitor indicator after a navigation transition has settled.
_Avoid_: current screen, destination state

**Story gesture**:
A qualified wheel, touch, or key intent that advances the Story by at most one Page.
_Avoid_: scroll burst, input packet

**Story navigation**:
The rules that turn Story gestures into movement between Stable pages while preserving the visitor's place during transitions and viewport changes.
_Avoid_: scroll controller, paging layer
