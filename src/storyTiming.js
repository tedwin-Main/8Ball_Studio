// The site's motion settings: one dial per kind of feel. The ?tune panel adjusts them live.
export const STORY_SETTINGS = Object.freeze( {
  // Page coast after a scroll: the share of the remaining distance closed each frame (1 = no coast).
  glide: 0.1,
  // How far one wheel tick moves the page, as a share of its raw distance.
  wheel: 0.7,
  // Seconds the animations trail the scroll; Projects and Contact use half.
  weight: 0.4,
  // Seconds the one-scroll Intro break takes to reach Studio.
  introSeconds: 3,
  // How dramatic the page changes are: 1 as designed, 0 flat.
  depth: 1,
  // Most degrees content leans when you scroll fast.
  skew: 4,
} )
