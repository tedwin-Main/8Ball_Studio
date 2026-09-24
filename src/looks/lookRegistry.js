// Central registry for the site's visual "looks": whole-site themes that share one markup and
// one scroll story, and differ in material, type, lighting, and how Studio is lit.
// The Story has one transition, Intro → Studio; each look owns that cue (its reveal shape, letter
// entrance, and label entrance). Projects and Contact scroll as normal sections in every look.
// A look is selected with ?look=<id> and switched live, like the intro Drafts.
// Every dark look lives in the same room: a pool or snooker hall at night where the only light
// is the lamp over the table. Light comes from that lamp, never from glowing UI edges.

// Reveals are scrubbed by scroll, so the ease decides how much of the Page each wheel notch lights.
// Circle, canopy, and beam open in two dimensions at once (lit area ~ opening²), so opening by √t
// lights an even share of the Page per notch instead of flooding most of it in the first one.
const evenArea = ( t ) => Math.sqrt( t )
const evenCone = ( t ) => 1 - Math.sqrt( 1 - t )

// How Studio arrives. Each entry returns the clip-path (or opacity) states for the reveal.
// origin is a CSS position for reveals that start from a light source.
export const REVEALS = Object.freeze( {
  // A round light flood from a point: the Cyc Wall's gel light spilling out of the pocket.
  circle: Object.freeze( { from: ( origin ) => ( { clipPath: `circle(0% at ${origin})` } ), to: ( origin ) => ( { clipPath: `circle(150% at ${origin})`, ease: evenArea } ) } ),
  // A TV canopy light rig switching on: a lit rectangle opening from the centre.
  canopy: Object.freeze( { from: () => ( { clipPath: 'inset(48% 50% 48% 50%)' } ), to: () => ( { clipPath: 'inset(0% 0% 0% 0%)', ease: evenArea } ) } ),
  // A pendant lamp's beam: a cone whose apex hangs above the screen at the lamp's x position.
  // It starts as a thin shaft of light down to the floor and widens sideways, the way a lamp's
  // cone reads when it comes on. At rest each slanted side crosses y = 0 just outside its top
  // corner, so the fully opened cone covers the whole screen and no notch is spent off-screen.
  // A full-height cone widening sideways lights roughly 1 - (1 - t)² of the Page, so the inverse
  // ease 1 - √(1 - t) makes the lit share grow evenly with every wheel notch.
  beam: Object.freeze( {
    from: ( origin ) =>
    {
      const x = parseFloat( origin )
      return { clipPath: `polygon(${x}% -60%, ${x}% -60%, ${x + 1.5}% 100%, ${x - 1.5}% 100%)` }
    },
    to: ( origin ) =>
    {
      const x = parseFloat( origin )
      // A side from (top, -60%) to (foot, 100%) crosses y = 0 at 60/160 = 0.375 of the way down;
      // solve for the foot that puts that crossing 2% outside the frame.
      // Rounded as numbers, never toFixed: GSAP reads a unit as the text after String(parseFloat(n)),
      // so "-42.00%" tweens with unit ".00%" and every in-between frame is invalid CSS.
      const footFor = ( top, edgeAtZero ) => Math.round( ( top + ( edgeAtZero - top ) / 0.375 ) * 100 ) / 100
      const left = footFor( x - 12, -2 )
      const right = footFor( x + 12, 102 )
      return { clipPath: `polygon(${x - 12}% -60%, ${x + 12}% -60%, ${right}% 100%, ${left}% 100%)`, ease: evenCone }
    },
  } ),
  // A ticket pulled down out of the hall's dispenser slot. Lit area grows in one dimension, so linear is already even.
  pull: Object.freeze( { from: () => ( { clipPath: 'inset(0% 0% 100% 0%)' } ), to: () => ( { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none' } ) } ),
  // A print developing: Studio appears in stepped exposures (opacity only, no clip).
  develop: Object.freeze( { usesOpacity: true, from: () => ( { clipPath: 'none', autoAlpha: 0 } ), to: () => ( { autoAlpha: 1, ease: 'steps(6)' } ) } ),
  // A film frame pulled down into the gate by the claw: intermittent, in hard steps.
  gate: Object.freeze( { from: () => ( { clipPath: 'inset(0% 0% 100% 0%)' } ), to: () => ( { clipPath: 'inset(0% 0% 0% 0%)', ease: 'steps(10)' } ) } ),
  // The lamp swinging on: its light edge crosses the frame on a diagonal, like a cast shadow's edge.
  // At rest the slanted edge sits outside the right side, so the whole screen is lit.
  sweep: Object.freeze( {
    from: () => ( { clipPath: 'polygon(0% 0%, 0% 0%, -40% 100%, -40% 100%)' } ),
    to: () => ( { clipPath: 'polygon(0% 0%, 140% 0%, 100% 100%, -40% 100%)', ease: 'none' } ),
  } ),
  // A poster pasted up: the brush drags it onto the wall left to right.
  paste: Object.freeze( { from: () => ( { clipPath: 'inset(0% 100% 0% 0%)' } ), to: () => ( { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power1.inOut' } ) } ),
  // The table's downlight coming on: an ellipse of light spreading down from the lamp just above frame.
  pool: Object.freeze( { from: () => ( { clipPath: 'ellipse(0% 0% at 50% -8%)' } ), to: () => ( { clipPath: 'ellipse(170% 150% at 50% -8%)', ease: evenArea } ) } ),
  // A board switched on in one cut; the flaps carry the motion. On from the first scrolled frame.
  cut: Object.freeze( { usesOpacity: true, from: () => ( { clipPath: 'none', autoAlpha: 0 } ), to: () => ( { autoAlpha: 1, ease: ( t ) => ( t > 0 ? 1 : 0 ) } ) } ),
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
  cyc: Object.freeze( { id: 'cyc', label: 'Cyc Wall', motion: CYC_MOTION } ),

  // The table seen from the lamp: the page is the bed under a rectangular downlight, the rails in
  // real walnut, six pockets, the rest of the hall black beyond the light.
  downlight: Object.freeze( {
    id: 'downlight',
    label: 'Downlight',
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

  // Table-level POV: the camera sits on the rail, eye level with the balls. The Page is the cloth
  // under one lamp, and the studio's name is printed into the baize like a tournament cloth.
  baize: Object.freeze( {
    id: 'baize',
    label: 'Baize',
    motion: Object.freeze( {
      // The lamp over the table coming on. The origin matches Studio's --lamp-x in baize.css,
      // so the cone drops from the shade that then lights the cloth.
      reveal: 'beam',
      origin: '44%',
      // Letters roll in across the cloth. Rolling friction is a constant deceleration, which is a
      // quadratic ease-out (power1.out): no overshoot, because cloth never bounces anything back.
      entrance: Object.freeze( { xPercent: 140, autoAlpha: 0 } ),
      letterEase: 'power1.out',
      // Leather tabs are set down on the cloth: a short drop, then still.
      label: Object.freeze( { from: Object.freeze( { autoAlpha: 0, yPercent: -35 } ), ease: 'power2.out' } ),
    } ),
  } ),

  // Televised snooker: a black arena, one rectangular canopy light, broadcast graphics.
  crucible: Object.freeze( {
    id: 'crucible',
    label: 'Crucible',
    motion: Object.freeze( {
      reveal: 'canopy',
      origin: CYC_MOTION.origin,
      entrance: Object.freeze( { yPercent: 38, autoAlpha: 0 } ),
      letterEase: 'power4.out',
      // Broadcast lower-thirds slide in from the left edge of the frame.
      label: Object.freeze( { from: Object.freeze( { autoAlpha: 0, xPercent: -18 } ), ease: 'power3.out' } ),
    } ),
  } ),

  // The hall after hours, turned darkroom: the lamp over the table is gelled safelight amber and
  // Studio develops on the cloth in stepped exposures, like a test strip.
  develop: Object.freeze( {
    id: 'develop',
    label: 'Safelight',
    motion: Object.freeze( {
      reveal: 'develop',
      origin: CYC_MOTION.origin,
      entrance: Object.freeze( { autoAlpha: 0 } ),
      letterEase: 'steps(5)',
      // Grease-pencil labels are written on, left to right.
      label: Object.freeze( { from: Object.freeze( { autoAlpha: 0, clipPath: 'inset(0% 100% 0% 0%)' } ), to: Object.freeze( { clipPath: 'inset(0% 0% 0% 0%)' } ), ease: 'power2.out' } ),
    } ),
  } ),

  // The hall's own printed goods (table chits, chalk wrappers, the house card), all printed in
  // three inks by one press, lying in the lamp's pool on the table.
  chit: Object.freeze( {
    id: 'chit',
    label: 'House Print',
    motion: Object.freeze( {
      reveal: 'pull',
      origin: CYC_MOTION.origin,
      // Each letter lands a hair off-register and is pulled true, the way a cheap press prints.
      entrance: Object.freeze( { x: 5, y: -3, autoAlpha: 0 } ),
      letterEase: 'power3.out',
      // Rubber-stamped: oversize, then pressed down hard.
      label: Object.freeze( { from: Object.freeze( { autoAlpha: 0, scale: 1.3 } ), ease: 'power4.out' } ),
    } ),
  } ),

  // ---- Re-roll 1, bolder register: foreign forms moved into the same dark hall. ----

  // Hand-processed 16mm: the studio's own film of the hall. Every section is a frame on the strip,
  // so scrolling past the stage pulls the strip through; Studio burns in on a light leak.
  film: Object.freeze( {
    id: 'film',
    label: '16mm',
    motion: Object.freeze( {
      reveal: 'gate',
      origin: CYC_MOTION.origin,
      // The frame arrives over-exposed and orange where light leaked past the perforations, then
      // the emulsion settles to silver: the look's one warm moment, reserved for the active frame.
      warmup: Object.freeze( {
        from: Object.freeze( { filter: 'brightness(2.2) sepia(1) saturate(3.4) hue-rotate(-14deg)' } ),
        to: Object.freeze( { filter: 'brightness(1) sepia(0) saturate(1) hue-rotate(0deg)' } ),
      } ),
      // Letters jitter into register, a frame at a time.
      entrance: Object.freeze( { yPercent: 7, autoAlpha: 0 } ),
      letterEase: 'steps(3)',
      // Edge codes are printed in, not slid.
      label: Object.freeze( { from: Object.freeze( { autoAlpha: 0, xPercent: -6 } ), ease: 'steps(2)' } ),
    } ),
  } ),

  // The noir one-sheet: a cue ball small under the one lamp, its shadow thrown huge up the wall,
  // the name in condensed caps like a charge read out, the services as the ruled billing block.
  noir: Object.freeze( {
    id: 'noir',
    label: 'One-Sheet',
    motion: Object.freeze( {
      reveal: 'sweep',
      origin: CYC_MOTION.origin,
      // The lamp swings on from dark: the ink comes up hard before the paper does.
      warmup: Object.freeze( {
        from: Object.freeze( { filter: 'brightness(0.15) contrast(1.8)' } ),
        to: Object.freeze( { filter: 'brightness(1) contrast(1)' } ),
      } ),
      entrance: Object.freeze( { yPercent: 26, autoAlpha: 0 } ),
      letterEase: 'power3.out',
      // Billing lines are set, left to right.
      label: Object.freeze( { from: Object.freeze( { autoAlpha: 0, clipPath: 'inset(0% 100% 0% 0%)' } ), to: Object.freeze( { clipPath: 'inset(0% 0% 0% 0%)' } ), ease: 'power1.inOut' } ),
    } ),
  } ),

  // The hall's split-flap table board: every letter in its own flap cell, services as board rows.
  flap: Object.freeze( {
    id: 'flap',
    label: 'Table Board',
    motion: Object.freeze( {
      reveal: 'cut',
      origin: CYC_MOTION.origin,
      // Each flap falls from the top half and slaps shut: accelerating, no settle.
      entrance: Object.freeze( { rotationX: -95, autoAlpha: 0, transformOrigin: '50% 50%' } ),
      letterEase: 'power3.in',
      label: Object.freeze( { from: Object.freeze( { autoAlpha: 0, rotationX: -90, transformOrigin: '50% 0%' } ), ease: 'power3.in' } ),
    } ),
  } ),

  // Wild posting on the hall wall: wood-type caps at wall scale, pasted on diagonals, cropped by
  // the edge, lit by the lamp while the rest of the wall stays dark.
  poster: Object.freeze( {
    id: 'poster',
    label: 'Wild Posting',
    motion: Object.freeze( {
      reveal: 'paste',
      origin: CYC_MOTION.origin,
      // Every word slams in one beat: oversize, then flat against the wall.
      entrance: Object.freeze( { scale: 1.5, autoAlpha: 0 } ),
      letterEase: 'expo.in',
      label: Object.freeze( { from: Object.freeze( { autoAlpha: 0, scale: 1.12, rotation: -5 } ), ease: 'power4.out' } ),
    } ),
  } ),

  // ---- Re-roll 2: the playing environment itself: dark, professional, lit by the table's downlight. ----

  // The hall's marker board on the wall behind the table: a slate in a mahogany frame, chalked by
  // hand, scoring wires with beads, engraved brass plates. The downlight spills onto its top edge.
  marker: Object.freeze( {
    id: 'marker',
    label: 'Marker Board',
    motion: Object.freeze( {
      reveal: 'pool',
      origin: CYC_MOTION.origin,
      // Chalk is written, left to right: each letter wiped on across its width.
      entrance: Object.freeze( { clipPath: 'inset(0% 100% 0% 0%)', autoAlpha: 0 } ),
      entranceTo: Object.freeze( { clipPath: 'inset(0% 0% 0% 0%)' } ),
      letterFrom: 'start',
      letterEase: 'power1.inOut',
      // Rails and plates settle onto the board: a short drop, no travel.
      label: Object.freeze( { from: Object.freeze( { autoAlpha: 0, y: -6 } ), ease: 'power2.out' } ),
    } ),
  } ),
} )

export const LOOK_IDS = Object.freeze( Object.keys( LOOK_CONFIGS ) )
// Chosen in the direction round (re-roll 2): the table seen from the lamp.
export const DEFAULT_LOOK_ID = 'downlight'

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
