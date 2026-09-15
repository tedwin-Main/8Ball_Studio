// Central data-driven registry for all 8Ball Studio animation drafts.
// Declares stable query IDs, switcher labels, fallback behavior, and capabilities once.

export const DRAFT_CONFIGS = Object.freeze( {
  cinematic: Object.freeze( {
    id: 'cinematic',
    label: '01 3D POV',
    hasWebgl: false,
    fallbackId: null,
  } ),
  photoreal: Object.freeze( {
    id: 'photoreal',
    label: '02 3D Break',
    hasWebgl: true,
    fallbackId: 'cinematic',
  } ),
  original: Object.freeze( {
    id: 'original',
    label: '03 Original',
    hasWebgl: false,
    fallbackId: null,
  } ),
} )

export const DRAFT_IDS = Object.freeze( Object.keys( DRAFT_CONFIGS ) )

// Maps legacy query aliases to current stable draft identifiers.
const DRAFT_ALIASES = Object.freeze( {
  photo: 'cinematic',
  classic: 'photoreal',
  webgl: 'photoreal',
} )

// Resolves a URL query string to a validated draft ID, defaulting to cinematic.
export function normalizeDraftId( queryValue )
{
  if ( !queryValue )
  {
    return 'cinematic'
  }

  // Check alias dictionary first.
  let resolvedId = queryValue
  if ( DRAFT_ALIASES[ queryValue ] )
  {
    resolvedId = DRAFT_ALIASES[ queryValue ]
  }

  // Check if draft exists in configuration.
  if ( DRAFT_CONFIGS[ resolvedId ] )
  {
    return resolvedId
  }

  return 'cinematic'
}

// Returns the options list for DraftSwitcher navigation.
export function getDraftOptions()
{
  const options = []
  for ( let i = 0; i < DRAFT_IDS.length; i++ )
  {
    const id = DRAFT_IDS[ i ]
    const config = DRAFT_CONFIGS[ id ]
    options.push( {
      id: id,
      label: config.label,
    } )
  }
  return options
}

// Returns configuration for a specific draft ID.
export function getDraftConfig( id )
{
  if ( DRAFT_CONFIGS[ id ] )
  {
    return DRAFT_CONFIGS[ id ]
  }
  return DRAFT_CONFIGS.cinematic
}
