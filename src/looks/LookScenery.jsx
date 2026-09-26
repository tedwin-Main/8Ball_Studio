import brandLogo from '../assets/8BALL-V4.jpg'
import { BREAK_REST_BALLS, ballColor, ballKind, toLandscapeCloth } from './breakRest.js'

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

// The balls the Intro break left on the table, seen from the lamp (src/looks/breakRest.js).
// Painted in CSS (downlight.css) at the size of a real ball on this cloth; the striker is the logo ball.
// Each ball's number spot turns a different way, as balls stop at random.
function BreakRest ()
{
  return (
    <div className="dl-balls">
      { BREAK_REST_BALLS.map( ( ball ) =>
      {
        const { u, v } = toLandscapeCloth( ball )
        const kind = ballKind( ball.number )
        const style = {
          left: `${( u * 100 ).toFixed( 2 )}%`,
          top: `${( v * 100 ).toFixed( 2 )}%`,
          '--ball': ballColor( ball.number ),
          '--spin': `${( ball.number * 137 ) % 360}deg`,
        }
        if ( kind === 'striker' ) return <img className="dl-ball is-striker" src={ brandLogo } alt="" style={ style } key={ ball.number } />
        return <span className={ `dl-ball is-${kind}` } data-number={ ball.number } style={ style } key={ ball.number } />
      } ) }
    </div>
  )
}

// Pool Table (id downlight): the rendered table seen from the lamp, and the cloth laid over its bed.
// Studio keeps the balls where the break left them; on later Pages the table is cleared for the work.
function DownlightTable ( { page } )
{
  return (
    <div className="dl-table">
      <div className="dl-cloth" />
      {/* A sibling of the cloth, not a child: the cloth blends in soft-light, and the balls must not. */}
      { page === 'studio' && <BreakRest /> }
    </div>
  )
}

const SCENES = {
  acid: {
    studio: () => <AcidOrbits rings={ [ 'one', 'two' ] } />,
  },
  downlight: {
    studio: () => <DownlightTable page="studio" />,
    projects: () => <DownlightTable page="projects" />,
    contact: () => <DownlightTable page="contact" />,
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
