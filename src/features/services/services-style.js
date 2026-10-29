// Defines services/nav style presets and normalizes style picks from the URL query.
import { clamp } from '../../common/utils/math-helpers.js'

// Services layouts. Visitors get the index rows; ?tune adds a select for the accordion and the two flat drums
// (?services=<id> picks one directly). Each drum lists the six services in one vertical column
// that the scroll slides past a fixed centre line: flat, no cylinder, the active row at the centre.
export const SERVICES_STYLES = Object.freeze( {
  accordion: 'Accordion',
  'drum-media': 'Flat drum · names + media',
  'drum-cards': 'Flat drum · cards',
  index: 'Index · rows',
} )

// Nav link alignment drafts, ?tune only (?nav=<id> picks one directly). Visitors get 'rail'.
export const NAV_STYLES = Object.freeze( {
  right: 'Links right',
  center: 'Links centred',
  rail: 'Rail · page-grid progress line',
} )

export const DEFAULT_NAV_STYLE = 'rail'

export function normalizeNavStyle ( queryValue )
{
  return Object.hasOwn( NAV_STYLES, queryValue ?? '' ) ? queryValue : DEFAULT_NAV_STYLE
}

export const DEFAULT_SERVICES_STYLE = 'index'

// Resolves a ?services= value to a known layout, falling back to the index rows.
export function normalizeServicesStyle ( queryValue )
{
  return Object.hasOwn( SERVICES_STYLES, queryValue ?? '' ) ? queryValue : DEFAULT_SERVICES_STYLE
}

// Where a row sits on the flat drum. offset: rows from the centre line (fractional while scrolling).
// The row slides by whole row heights and fades out over `visible` rows from the centre.
export function flatDrumRow ( offset, { rowPx, visible } )
{
  return { y: offset * rowPx, opacity: Math.max( 0, 1 - Math.abs( offset ) / visible ) }
}

// Which row is at the centre line for a scroll progress of 0–1 across `count` rows.
export function flatDrumActive ( progress, count )
{
  const index = Math.round( progress * ( count - 1 ) )
  return clamp( index, 0, count - 1 )
}

// Accent palette drafts, ?tune only (?theme=<id> picks one directly). Visitors get 'lime'.
export const THEME_STYLES = Object.freeze( {
  lime: 'Lime (current)',
  noir: 'Noir · black & ivory',
  midnight: 'Midnight & bone',
  platinum: 'Graphite & platinum',
} )

// Draft registry: every ?tune section, its options, its visitor default. ?<section>=<id> picks one directly.
// New section drafts register here, so App state, URL sync and TuneSelect pick them up with no extra wiring.
export const DRAFTS = Object.freeze( {
  services: Object.freeze( { label: 'Services', options: SERVICES_STYLES, fallback: DEFAULT_SERVICES_STYLE } ),
  nav: Object.freeze( { label: 'Nav', options: NAV_STYLES, fallback: DEFAULT_NAV_STYLE } ),
  manifesto: Object.freeze( { label: 'Manifesto', options: Object.freeze( { chalk: 'Chalk chapter', felt: 'Felt (original)' } ), fallback: 'chalk' } ),
  footer: Object.freeze( { label: 'Footer', options: Object.freeze( { grid: 'Contact grid', classic: 'Classic' } ), fallback: 'grid' } ),
  theme: Object.freeze( { label: 'Theme', options: THEME_STYLES, fallback: 'lime' } ),
} )

// Resolves one section's query value to a known draft id, falling back to the visitor default.
export function normalizeDraft ( section, queryValue )
{
  const draft = DRAFTS[ section ]
  return Object.hasOwn( draft.options, queryValue ?? '' ) ? queryValue : draft.fallback
}

// Every section's draft from a location.search string.
export function readDrafts ( search )
{
  const params = new URLSearchParams( search )
  return Object.fromEntries( Object.keys( DRAFTS ).map( ( section ) => [ section, normalizeDraft( section, params.get( section ) ) ] ) )
}
