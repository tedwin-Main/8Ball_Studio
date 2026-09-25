// Look-specific set pieces drawn behind each Page's content: the room a look puts the Story in.
// Everything here is decorative (aria-hidden, no pointer events); the Page content, headings, and
// links stay in App.jsx so every look shares one accessible structure and one set of class hooks.

// Acid Night: the thin orbit rings of the original single-look build (commit 91fcc52), drawn on each
// Page where that build drew them: two over Studio, one over Projects, one over Contact.
function AcidOrbits ( { rings } )
{
  return rings.map( ( ring ) => <span className={ `acid-orbit acid-orbit-${ring}` } key={ ring } /> )
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
  acid: {
    studio: () => <AcidOrbits rings={ [ 'one', 'two' ] } />,
    projects: () => <AcidOrbits rings={ [ 'three' ] } />,
    contact: () => <AcidOrbits rings={ [ 'four' ] } />,
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
