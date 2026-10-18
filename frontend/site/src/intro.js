/**
 * FILE: src/intro.js
 * PURPOSE: intro state shared by preloader, scroll engine and hero title; decides skip once at load
 * UI: Site > Preloader, Hero
 * USED BY: src/sections/Preloader.jsx, src/sections/BreakHero.jsx, src/App.jsx
 * KEY EXPORTS: intro, introDone, finishIntro
 */

const SEEN_KEY = '8b-intro-seen'

// Run engine: storage can throw (private mode, blocked site data); treat as first visit
const seenThisSession = () => {
  try {
    return window.sessionStorage.getItem( SEEN_KEY ) === '1'
  } catch {
    return false
  }
}

let resolveIntro
export const introDone = new Promise( ( resolve ) => {
  resolveIntro = resolve
} )

// skip: reduced motion, or same-tab reload (intro once per session reads as craft, twice as a wall)
export const intro = {
  skip: window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches || seenThisSession(),
  done: false,
}

export function finishIntro() {
  if ( intro.done ) return
  intro.done = true
  try {
    window.sessionStorage.setItem( SEEN_KEY, '1' )
  } catch {
    // storage blocked: intro shows again next load, harmless
  }
  resolveIntro()
}

if ( intro.skip ) finishIntro()
