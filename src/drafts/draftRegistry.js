// The Intro's draft registry. One draft is left: 01 3D POV (the cinematic pool break, PoolPovDraft.jsx).
// Drafts 02 (3D Break, photoreal) and 03 (Original) were removed; their ?draft= links fall back to 01.

export const DRAFT_CONFIGS = Object.freeze( {
  cinematic: Object.freeze( {
    id: 'cinematic',
    label: '01 3D POV',
  } ),
} )

export const DRAFT_IDS = Object.freeze( Object.keys( DRAFT_CONFIGS ) )

// Resolves a URL query string to a validated draft ID. Any unknown or retired value (including the
// old 02 and 03 ids) falls back to the one draft.
export function normalizeDraftId( queryValue )
{
  return Object.hasOwn( DRAFT_CONFIGS, queryValue ?? '' ) ? queryValue : 'cinematic'
}
