// Look-specific set pieces drawn behind each Page's content: the room a look puts the Story in.
// Everything here is decorative (aria-hidden, no pointer events); the Page content, headings, and
// links stay in App.jsx so every look shares one accessible structure and one set of class hooks.

// Main (id 'acid'): the thin orbit rings of the original single-look build (commit 91fcc52), over Studio only.
// They read as rings on the dark ink; on the paper and acid Pages only one faint arc of each would show,
// which looks like a stray hair across the screen, so Projects and Contact have none.
function AcidOrbits ( { rings } )
{
  return rings.map( ( ring ) => <span className={ `acid-orbit acid-orbit-${ring}` } key={ ring } /> )
}

// Pool Table (id downlight): the rendered table seen from the lamp, and the cloth laid over its bed.
function DownlightTable ()
{
  return (
    <div className="dl-table">
      <div className="dl-cloth" />
    </div>
  )
}

const SCENES = {
  acid: {
    studio: () => <AcidOrbits rings={ [ 'one', 'two' ] } />,
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
