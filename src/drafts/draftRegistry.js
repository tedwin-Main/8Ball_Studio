// Central data-driven registry for all 8Ball Studio animation drafts.
// Declares stable query IDs, switcher labels, fallback behavior, and capabilities once.

export const DRAFT_CONFIGS = Object.freeze( {
  cinematic: Object.freeze( {
    id: 'cinematic',
    label: '01 3D POV',
    hasWebgl: false,
    fallbackId: null,
  } ),
  webgl: Object.freeze( {
    id: 'webgl',
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
  photoreal: Object.freeze( {
    id: 'photoreal',
    label: '04 Photoreal',
    hasWebgl: true,
    fallbackId: 'cinematic',
  } ),
} )

export const DRAFT_IDS = Object.freeze( Object.keys( DRAFT_CONFIGS ) )

// Maps legacy query aliases to current stable draft identifiers.
const DRAFT_ALIASES = Object.freeze( {
  photo: 'cinematic',
  classic: 'webgl',
} )

// Resolves a URL query string to a validated draft ID, defaulting to cinematic.
export const normalizeDraftId = ( queryValue ) =>
{
  if ( !queryValue ) return 'cinematic'
  const aliased = DRAFT_ALIASES[ queryValue ] ?? queryValue
  return DRAFT_CONFIGS[ aliased ] ? aliased : 'cinematic'
}

// Returns the options list for DraftSwitcher navigation.
export const getDraftOptions = () =>
  DRAFT_IDS.map( ( id ) => ( {
    id,
    label: DRAFT_CONFIGS[ id ].label,
  } ) )

// Returns configuration for a specific draft ID.
export const getDraftConfig = ( id ) =>
  DRAFT_CONFIGS[ id ] ?? DRAFT_CONFIGS.cinematic
