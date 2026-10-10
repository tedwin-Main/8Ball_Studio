import { useLayoutEffect, useRef } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SERVICES } from '../content'
import { flatDrumActive, flatDrumRow } from '../servicesStyle'

// How many rows from the centre a row has faded out (the window's mask fades its edges on top of this).
const VISIBLE_ROWS = 2.4

// One service's reel tile: poster until it is the active row, then the reel plays (JS below).
const ReelTile = ( { service } ) => (
  <figure className="drum-tile">
    <video src={ service.reel.src } poster={ service.reel.poster } muted loop playsInline preload="none" />
  </figure>
)

// Desire, ?tune draft: the six services on a flat drum. The section sticks for one screen while the
// scroll slides the column up past the centre line, one service per step (--drum-step). The row at the
// centre is active: lit, its detail shown, its reel playing while the drum is on screen.
// variant: 'drum-media' (names, with the active reel beside them), 'drum-names' (names alone),
// 'drum-cards' (each row is a card carrying its own reel).
export function ServicesDrum( { variant } ) {
  const rootRef = useRef( null )

  useLayoutEffect( () => {
    const root = rootRef.current
    const windowEl = root.querySelector( '.drum-window' )
    const rows = [ ...root.querySelectorAll( '.drum-row' ) ]
    const sideTiles = [ ...root.querySelectorAll( '.drum-media .drum-tile' ) ]
    // The reels that play: the side tiles (names + media) or the rows' own (cards).
    const videos = [ ...root.querySelectorAll( '.drum-tile video' ) ]
    const reduced = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches
    let rowPx = 0
    let active = -1
    let inView = false

    // Row pitch: the tallest row plus the column gap, so rows never overlap.
    const measure = () => {
      const gap = parseFloat( window.getComputedStyle( windowEl ).rowGap ) || 0
      rowPx = Math.max( ...rows.map( ( row ) => row.offsetHeight ) ) + gap
    }

    const play = () => videos.forEach( ( video, index ) => {
      if ( inView && index === active ) video.play()?.catch( () => {} )
      else video.pause()
    } )

    const setActive = ( next ) => {
      if ( next === active ) return
      active = next
      rows.forEach( ( row, index ) => row.classList.toggle( 'is-active', index === active ) )
      sideTiles.forEach( ( tile, index ) => tile.classList.toggle( 'is-active', index === active ) )
      play()
    }

    const render = ( progress ) => {
      const turn = progress * ( rows.length - 1 )
      rows.forEach( ( row, index ) => {
        const { y, opacity } = flatDrumRow( index - turn, { rowPx, visible: VISIBLE_ROWS } )
        row.style.transform = `translateY(calc(-50% + ${ y }px))`
        row.style.opacity = opacity
      } )
      setActive( flatDrumActive( progress, rows.length ) )
    }

    // Plays the active reel only while the drum is on screen.
    const viewTrigger = ScrollTrigger.create( {
      trigger: root,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: ( self ) => {
        inView = self.isActive
        play()
      },
    } )

    // Reduced motion: a plain list (CSS), the first service active, no scroll-driven slide.
    if ( reduced ) {
      setActive( 0 )
      return () => {
        viewTrigger.kill()
        videos.forEach( ( video ) => video.pause() )
      }
    }

    measure()
    const slideTrigger = ScrollTrigger.create( {
      trigger: root,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: ( self ) => render( self.progress ),
      onRefresh: ( self ) => {
        measure()
        render( self.progress )
      },
    } )
    render( slideTrigger.progress )

    return () => {
      slideTrigger.kill()
      viewTrigger.kill()
      videos.forEach( ( video ) => video.pause() )
    }
  }, [ variant ] )

  return (
    <section
      className={ `services-drum is-${ variant }` }
      style={ { '--drum-rows': SERVICES.length } }
      aria-labelledby="services-title"
      ref={ rootRef }
    >
      <div className="drum-stage">
        <h2 id="services-title" className="section-title drum-title">What we make</h2>
        <div className="drum-body">
          <ol className="drum-window" aria-label="Services">
            { SERVICES.map( ( service, index ) => (
              <li className="drum-row" key={ service.name }>
                <span className="drum-index">{ String( index + 1 ).padStart( 2, '0' ) }</span>
                <span className="drum-text">
                  <span className="drum-name">{ service.name }</span>
                  <span className="drum-detail">{ service.detail }</span>
                </span>
                { variant === 'drum-cards' && <ReelTile service={ service } /> }
              </li>
            ) ) }
          </ol>
          { variant === 'drum-media' && (
            <div className="drum-media" aria-hidden="true">
              { SERVICES.map( ( service ) => <ReelTile service={ service } key={ service.name } /> ) }
            </div>
          ) }
        </div>
      </div>
    </section>
  )
}
