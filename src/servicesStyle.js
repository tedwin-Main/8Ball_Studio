// Services layouts. Visitors get the accordion; ?tune adds a select for the three flat drums
// (?services=<id> picks one directly). Each drum lists the six services in one vertical column
// that the scroll slides past a fixed centre line: flat, no cylinder, the active row at the centre.
export const SERVICES_STYLES = Object.freeze( {
  accordion: 'Accordion',
  'drum-media': 'Flat drum · names + media',
  'drum-cards': 'Flat drum · cards',
} )

export const DEFAULT_SERVICES_STYLE = 'accordion'

// Resolves a ?services= value to a known layout, falling back to the accordion.
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
  return Math.min( count - 1, Math.max( 0, index ) )
}
