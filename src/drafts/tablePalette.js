// Shared tournament-table palette used by the WebGL drafts.
// These values match the richer felt treatment from the e472197 reference draft.
export const TABLE_PALETTE = Object.freeze( {
  felt: '#0e4c36',
  // Solid PBR felt needs a lower albedo than Draft 2's textured map to render at the same depth.
  feltPbr: '#103425',
  feltSheen: '#73d994',
  feltBounce: '#1c5e45',
  cushion: '#0e4c36',
  rail: '#08080a',
  apron: '#0a0a0c',
  pocketInterior: '#050505',
  pocketBottom: '#040404',
  pocketCollar: '#151412',
} )
