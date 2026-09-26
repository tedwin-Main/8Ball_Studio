// The site's motion settings: one dial per kind of feel. The ?tune panel adjusts them live.
export const STORY_SETTINGS = Object.freeze( {
  // Page coast after a scroll: the share of the remaining distance closed each frame (1 = no coast).
  glide: 0.08,
  // How far one wheel tick moves the page, as a share of its raw distance.
  wheel: 0.4,
  // Seconds the animations trail the scroll; Projects and Contact use half.
  weight: 0.4,
  // Seconds the one-scroll Intro break takes to reach Studio.
  introSeconds: 3,
  // How dramatic the page changes are: 1 as designed, 0 flat.
  depth: 0.3,
  // Speed limit for wheel and trackpad: the most screens the scroll target may run ahead of the page.
  // Lower = heavier, slower flicks; 0 = no limit. Phones keep their native swipe and ignore it.
  speedLimit: 0.6,
  // Most degrees the Projects cards lean when you scroll fast: a hint of weight, never a wobble.
  skew: 1.5,
} )
