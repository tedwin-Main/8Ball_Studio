// Look-specific set pieces drawn behind each Page's content: the room a look puts the Story in.
// Everything here is decorative (aria-hidden, no pointer events); the Page content, headings, and
// links stay in App.jsx so every look shares one accessible structure and one set of class hooks.

// Marker Board: the hall's scoring board on the wall, and the lit table in front of it.
function MarkerBoard ( { children } )
{
  return (
    <div className="mk-board">
      {/* Brass corner fittings screwed into the mahogany frame. */}
      <span className="mk-fitting mk-fitting-tl" />
      <span className="mk-fitting mk-fitting-tr" />
      <span className="mk-fitting mk-fitting-bl" />
      <span className="mk-fitting mk-fitting-br" />
      { children }
    </div>
  )
}

// A chalk tally: four strokes for the four clients on the board (a true count, not a score).
function ChalkTally ()
{
  return (
    <svg className="mk-tally" viewBox="0 0 120 90">
      <path d="M14 10 16 80M38 8 36 82M60 11 62 79M84 9 82 81" />
    </svg>
  )
}

// Downlight: the table seen from the lamp, with six pockets and the diamond sights on the rails.
function DownlightTable ()
{
  return (
    <div className="dl-table">
      <div className="dl-cloth" />
      { [ 'tl', 'tm', 'tr', 'bl', 'bm', 'br' ].map( ( id ) => <span className={ `dl-pocket dl-pocket-${id}` } key={ id } /> ) }
    </div>
  )
}

const SCENES = {
  marker: {
    studio: () => <><MarkerBoard /><div className="mk-table" /></>,
    projects: () => <MarkerBoard><ChalkTally /></MarkerBoard>,
    contact: () => <MarkerBoard />,
  },
  downlight: {
    studio: DownlightTable,
    projects: DownlightTable,
    contact: DownlightTable,
  },
}

export function LookScenery ( { look, page } )
{
  const Scene = SCENES[ look ]?.[ page ]
  if ( !Scene ) return null
  return (
    <div className={ `look-scenery look-scenery-${look}` } aria-hidden="true">
      <Scene />
    </div>
  )
}
