// Central registry for the site's visual "looks": whole-site themes that share one markup and
// one scroll story. Main (id 'acid') is the only look left; its tokens (CSS), Studio cue (motion), and
// browser chrome colour per Page live here. Old ?look= links fall back to Main.
// The motion system is shared (src/motion/flowMotion.js): the Intro → Studio cue on the pinned stage,
// the Studio → Services and Services → Projects handoffs, the Projects run, and the Contact reveal.

// Reveals are scrubbed by scroll, so the ease decides how much of the Page each wheel notch lights.
// Opacity only, linear, so every notch of the scrub moves the fade the same amount.
export const REVEALS = Object.freeze( {
  // The original build's cut (commit 91fcc52): the opening composition fades into the Studio title.
  fade: Object.freeze( { usesOpacity: true, from: () => ( { clipPath: 'none', autoAlpha: 0 } ), to: () => ( { autoAlpha: 1, ease: 'none' } ) } ),
} )

export const LOOK_CONFIGS = Object.freeze( {
  // The original single look (commit 91fcc52): near-black ink, paper, and one acid-green signal, set in
  // the Cyc Wall's Archivo throughout: condensed caps titles, bold sentence-case small text. The only look whose palette
  // changes per Page: the Story runs ink (Studio) → black (Services) → black (Projects, white client logos) → the Contact
  // table's lamp-lit cloth in the black hall (Contact), each sheet arriving in its own colour.
  acid: Object.freeze( {
    id: 'acid',
    label: 'Main',
    themeColors: Object.freeze( { intro: '#07110d', studio: '#070908', services: '#000000', projects: '#000000', contact: '#030403' } ),
    // The elements that read the pointer key light (--lx / --ly): only Studio's wall glow.
    keyLight: '.title-screen > .cyc-wall',
    motion: Object.freeze( {
      reveal: 'fade',
      origin: '50% 50%',
      // Each title line is a mask: the letters rise out of it (yPercent 115 → 0), left to right.
      entrance: Object.freeze( { yPercent: 115 } ),
      letterFrom: 'start',
      letterEase: 'power3.out',
      // Labels settle up into place, the original build's meta reveal.
      label: Object.freeze( { from: Object.freeze( { autoAlpha: 0, y: 20 } ), ease: 'power2.out' } ),
    } ),
  } ),
} )

export const LOOK_IDS = Object.freeze( Object.keys( LOOK_CONFIGS ) )
export const DEFAULT_LOOK_ID = 'acid'

// The Design list (?tune's one dropdown, ?services=<id>). Studio2 is its own page (studio2.html), so
// picking it leaves Main; the other four are Main's Services layouts: the pinned panels (the default),
// or the six services on a vertical drum, carrying names beside the active reel, names alone, or cards.
export const SERVICES_STYLES = Object.freeze( {
  studio2: 'Studio2',
  panels: 'Main · Panels',
  'drum-media': 'Main · Drum names + media',
  'drum-names': 'Main · Drum names',
  'drum-cards': 'Main · Drum cards',
} )

// Main's own layouts: every Design option except Studio2, which has its own page.
export function normalizeServicesStyle ( queryValue )
{
  const isMainLayout = Object.hasOwn( SERVICES_STYLES, queryValue ?? '' ) && queryValue !== 'studio2'
  return isMainLayout ? queryValue : 'panels'
}

// Resolves a ?look= query value to a known look id, falling back to the default.
export function normalizeLookId ( queryValue )
{
  return Object.hasOwn( LOOK_CONFIGS, queryValue ?? '' ) ? queryValue : DEFAULT_LOOK_ID
}

export function getLookConfig ( id )
{
  return LOOK_CONFIGS[ normalizeLookId( id ) ]
}

// Returns the from/to vars for the Studio reveal in the given look.
export function getRevealVars ( lookId )
{
  const motion = getLookConfig( lookId ).motion
  const reveal = REVEALS[ motion.reveal ]
  return { from: reveal.from( motion.origin ), to: reveal.to( motion.origin ), usesOpacity: reveal.usesOpacity === true }
}

// The browser chrome colour (<meta name="theme-color">) for a Page in a look.
export function getThemeColor ( lookId, pageId )
{
  const colors = getLookConfig( lookId ).themeColors
  return colors[ pageId ] ?? colors.intro
}
