// Central registry for the site's visual "looks": whole-site themes that share one markup and
// one scroll story, and differ in material, type, lighting, and how Studio is lit.
// Every look shares the same motion system (src/motion/flowMotion.js): the Intro → Studio cue on the
// pinned stage, then the Studio → Projects handoff, the Projects run, and the Contact reveal.
// A look supplies only its tokens (CSS), its Studio cue (motion), and the browser chrome colour per Page.
// A look is selected with ?look=<id> or the Look dropdown, and switched live like the intro Drafts.

// Reveals are scrubbed by scroll, so the ease decides how much of the Page each wheel notch lights.
// Circle and canopy open in two dimensions at once (lit area ~ opening²), so opening by √t lights an
// even share of the Page per notch instead of flooding most of it in the first one.
const evenArea = ( t ) => Math.sqrt( t )

// How Studio arrives. Each entry returns the clip-path (or opacity) states for the reveal.
// origin is a CSS position for reveals that start from a light source.
export const REVEALS = Object.freeze( {
  // A round light flood from a point: the Cyc Wall's gel light spilling out of the pocket.
  circle: Object.freeze( { from: ( origin ) => ( { clipPath: `circle(0% at ${origin})` } ), to: ( origin ) => ( { clipPath: `circle(150% at ${origin})`, ease: evenArea } ) } ),
  // A TV canopy light rig switching on: a lit rectangle opening from the centre.
  canopy: Object.freeze( { from: () => ( { clipPath: 'inset(48% 50% 48% 50%)' } ), to: () => ( { clipPath: 'inset(0% 0% 0% 0%)', ease: evenArea } ) } ),
  // The original build's cut (commit 91fcc52): the opening composition fades into the Studio title.
  // Opacity only, linear, so every notch of the scrub moves the fade the same amount.
  fade: Object.freeze( { usesOpacity: true, from: () => ( { clipPath: 'none', autoAlpha: 0 } ), to: () => ( { autoAlpha: 1, ease: 'none' } ) } ),
} )

const CYC_MOTION = Object.freeze( {
  reveal: 'circle',
  // Studio light spills out of the pocket the 8-ball dropped into.
  origin: '88% 27%',
  // Silhouette letters are set down from the light's side, right to left.
  entrance: Object.freeze( { xPercent: 70, skewX: -14, autoAlpha: 0 } ),
  letterEase: 'cue',
  // Paper tape is slapped on: oversize and twisted, then pressed flat.
  label: Object.freeze( { from: Object.freeze( { autoAlpha: 0, scale: 1.14, rotation: 7 } ), ease: 'back.out(2.2)' } ),
} )

export const LOOK_CONFIGS = Object.freeze( {
  // The original single look (commit 91fcc52): near-black ink, paper, and one acid-green signal, set in
  // Space Grotesk throughout: caps titles, bold sentence-case small text. The only look whose palette changes per Page: the Story
  // runs ink (Studio) → paper (Projects) → full acid (Contact), each sheet arriving in its own colour.
  acid: Object.freeze( {
    id: 'acid',
    label: 'Main',
    themeColors: Object.freeze( { intro: '#07110d', studio: '#070908', projects: '#f2f1e9', contact: '#b7d95b' } ),
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

  // A photo-studio floor: after the break, the lights come up on an infinity cove, one gel per Page.
  cyc: Object.freeze( {
    id: 'cyc',
    label: 'Cyc Wall',
    themeColors: Object.freeze( { intro: '#0a0e0c', studio: '#ef3f86', projects: '#16a597', contact: '#f59e1b' } ),
    // Every lit cyc: its wall hotspot and the shadows its letters cast (styles.css, --cast-x / --cast-y).
    keyLight: '.cyc',
    motion: CYC_MOTION,
  } ),

  // The table seen from the lamp: the page is the bed under a rectangular downlight, the rails in
  // real walnut, six pockets, the rest of the hall black beyond the light.
  downlight: Object.freeze( {
    id: 'downlight',
    label: 'Pool Table',
    themeColors: Object.freeze( { intro: '#030403', studio: '#030403', projects: '#030403', contact: '#030403' } ),
    // The lamp's pool of light on the cloth.
    keyLight: '.dl-cloth',
    motion: Object.freeze( {
      reveal: 'canopy',
      origin: CYC_MOTION.origin,
      // Letters roll onto the cloth from the left, turning as they come and stopping on friction.
      entrance: Object.freeze( { xPercent: -160, rotation: -200, autoAlpha: 0 } ),
      letterFrom: 'start',
      letterEase: 'power2.out',
      label: Object.freeze( { from: Object.freeze( { autoAlpha: 0, x: -28 } ), ease: 'power2.out' } ),
    } ),
  } ),
} )

// Dropdown order: Main first (the default; id 'acid', kept so ?look=acid links still work), then Cyc Wall, then Pool Table (id 'downlight', kept so ?look=downlight links still work).
export const LOOK_IDS = Object.freeze( Object.keys( LOOK_CONFIGS ) )
export const DEFAULT_LOOK_ID = 'acid'

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
