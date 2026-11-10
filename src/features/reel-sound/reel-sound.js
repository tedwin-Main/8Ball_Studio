// Plays one looping service theme under the visible reel; sound on by default, starts on first tap.

const MUTE_KEY = 'reel-sound-muted'
// Browsers only allow sound inside a click or key press; scroll and swipes never count.
const GESTURE_EVENTS = [ 'click', 'keydown' ]

const audio = typeof Audio === 'undefined' ? null : Object.assign( new Audio(), { loop: true, preload: 'none' } )
// unlocked: browser let play() through at least once (set from the play() promise, never assumed).
const state = { unlocked: false, muted: readMuted(), wanted: null }
const listeners = new Set()

function readMuted() {
  try {
    return window.localStorage.getItem( MUTE_KEY ) === '1'
  } catch {
    return false
  }
}

function saveMuted( muted ) {
  try {
    window.localStorage.setItem( MUTE_KEY, muted ? '1' : '0' )
  } catch {
    // private mode: choice lasts this visit only
  }
}

function notify() {
  listeners.forEach( ( listener ) => listener() )
}

function setUnlocked( unlocked ) {
  if ( state.unlocked === unlocked ) return
  state.unlocked = unlocked
  notify()
}

// Plays when unmuted, a reel wants a theme and the tab is visible; else pauses (keeps position).
// A blocked play() marks sound locked again, so the speaker never shows on while silent.
function syncAudio() {
  if ( !audio ) return
  if ( state.muted || !state.wanted || document.hidden ) {
    audio.pause()
    return
  }
  audio.play().then( () => setUnlocked( true ), ( error ) => {
    if ( error.name === 'NotAllowedError' ) setUnlocked( false )
  } )
}

if ( audio ) {
  // Every tap retries inside the gesture (iOS needs play() in the handler itself); no-op once playing.
  GESTURE_EVENTS.forEach( ( type ) => document.addEventListener( type, syncAudio, true ) )
  document.addEventListener( 'visibilitychange', syncAudio )
}

// A reel on screen asks for its theme. A new track restarts from 0; the same track resumes where it paused.
export function requestTheme( url ) {
  if ( !audio || !url ) return
  if ( audio.dataset.track !== url ) {
    audio.dataset.track = url
    audio.src = url
  }
  state.wanted = url
  syncAudio()
}

// A reel leaving or pausing gives its theme back; ignored if another reel already took over.
export function releaseTheme( url ) {
  if ( !url || state.wanted !== url ) return
  state.wanted = null
  syncAudio()
}

// Audible: tap mutes. Silent (muted or still locked): tap unmutes and plays inside this tap.
export function toggleMute() {
  state.muted = isAudible()
  saveMuted( state.muted )
  syncAudio()
  notify()
}

export function isAudible() {
  return state.unlocked && !state.muted
}

export function subscribe( listener ) {
  listeners.add( listener )
  return () => listeners.delete( listener )
}
