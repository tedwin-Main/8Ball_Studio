import { STORY_SETTINGS } from '../storyTiming.js'

// Live overrides of STORY_SETTINGS from the ?tune panel; everything reads its values through getTuning().
export const TUNING_FIELDS = Object.freeze( [
  Object.freeze( { key: 'glide', label: 'Glide (1 = no coast)', min: 0.02, max: 1, step: 0.01 } ),
  Object.freeze( { key: 'wheel', label: 'Wheel distance', min: 0.3, max: 2, step: 0.05 } ),
  Object.freeze( { key: 'weight', label: 'Weight (s)', min: 0, max: 3, step: 0.05 } ),
  Object.freeze( { key: 'introSeconds', label: 'Intro (s)', min: 1, max: 6, step: 0.1 } ),
  Object.freeze( { key: 'depth', label: 'Depth', min: 0, max: 2, step: 0.05 } ),
  Object.freeze( { key: 'skew', label: 'Skew (deg)', min: 0, max: 12, step: 0.5 } ),
] )

// Values baked into the scroll timelines when they are built, so changing one rebuilds them.
export const REBUILD_KEYS = Object.freeze( [ 'weight', 'depth' ] )

export const TUNING_DEFAULTS = STORY_SETTINGS

let values = TUNING_DEFAULTS
const listeners = new Set()

export const getTuning = () => values

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

// The current values as lines to paste into STORY_SETTINGS in src/storyTiming.js.
export function formatTuningForTiming ( tuning = values )
{
  return TUNING_FIELDS.map( ( { key } ) => `  ${key}: ${tuning[ key ]},` ).join( '\n' )
}
