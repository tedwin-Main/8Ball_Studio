import { STORY_TIMING } from '../storyTiming.js'

// Live overrides for the scroll feel, set by the dev-only ?tune panel (src/components/TunePanel.jsx).
// Everything reads its values through getTuning(), so production (no panel) always gets the
// STORY_TIMING contract. Nothing is persisted: "Copy values" is how a feel makes it into storyTiming.js.

// The tunable values, where each lives in STORY_TIMING, and the slider range the panel offers.
export const TUNING_FIELDS = Object.freeze( [
  Object.freeze( { key: 'lerp', group: 'scroll', label: 'Glide (lerp)', min: 0.02, max: 0.2, step: 0.005 } ),
  Object.freeze( { key: 'wheelMultiplier', group: 'scroll', label: 'Wheel distance', min: 0.3, max: 2, step: 0.05 } ),
  Object.freeze( { key: 'scrubSeconds', group: 'scroll', label: 'Stage scrub (s)', min: 0, max: 3, step: 0.05 } ),
  Object.freeze( { key: 'sectionScrubSeconds', group: 'scroll', label: 'Section scrub (s)', min: 0, max: 2, step: 0.05 } ),
  Object.freeze( { key: 'skewMaxDeg', group: 'flow', label: 'Skew max (deg)', min: 0, max: 12, step: 0.5 } ),
  Object.freeze( { key: 'skewGain', group: 'flow', label: 'Skew gain', min: 0, max: 1.5, step: 0.05 } ),
] )

// Values that only take effect when the scroll timelines are rebuilt (a scrub is fixed per trigger).
export const REBUILD_KEYS = Object.freeze( [ 'scrubSeconds', 'sectionScrubSeconds' ] )

export const TUNING_DEFAULTS = Object.freeze( Object.fromEntries(
  TUNING_FIELDS.map( ( { key, group } ) => [ key, STORY_TIMING[ group ][ key ] ] ),
) )

let values = TUNING_DEFAULTS
const listeners = new Set()

export const getTuning = () => values

// Merges known, finite values and tells every subscriber; unknown keys are ignored.
export function setTuning ( patch )
{
  const next = { ...values }
  let changed = false
  TUNING_FIELDS.forEach( ( { key } ) =>
  {
    const value = patch?.[ key ]
    if ( Number.isFinite( value ) && value !== next[ key ] )
    {
      next[ key ] = value
      changed = true
    }
  } )
  if ( !changed ) return values
  const previous = values
  values = Object.freeze( next )
  listeners.forEach( ( listener ) => listener( values, previous ) )
  return values
}

export function resetTuning ()
{
  return setTuning( TUNING_DEFAULTS )
}

export function subscribeTuning ( listener )
{
  listeners.add( listener )
  return () => listeners.delete( listener )
}

// The current values as the lines to paste into STORY_TIMING_DEFAULTS in src/storyTiming.js.
export function formatTuningForTiming ( tuning = values )
{
  const lines = ( group ) => TUNING_FIELDS
    .filter( ( field ) => field.group === group )
    .map( ( { key } ) => `    ${key}: ${tuning[ key ]},` )
  return [ '  scroll: {', ...lines( 'scroll' ), '  },', '  flow: {', ...lines( 'flow' ), '  },' ].join( '\n' )
}
