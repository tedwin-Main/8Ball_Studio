import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SERVICES } from '../content'
import { flatDrumActive, flatDrumRow } from '../servicesStyle'

// How many rows from the centre a row has faded out (the window's mask fades its edges on top of this).
const VISIBLE_ROWS = 2.4
// How long the scroll must rest before the reel plays again.
const SETTLE_MS = 180

// The five pieces of one service, shown to the right of the names. Only the first reel mounts a <video>
// (the drum's one-reel rule); the other reels show their poster until the strip is wider than the screen.
// Keyed by service in the parent, so the strip remounts and its entrance replays on each new active row.
function MediaStrip( { service, hasReel, reelRef } ) {
  let reelUsed = false
  return (
    <div className="drum-strip" aria-hidden="true">
      { service.media.map( ( piece, index ) => {
        const playable = piece.type === 'video' && hasReel && !reelUsed
        if ( playable ) reelUsed = true
        return (
          <figure className="drum-strip-tile" style={ { '--n': index } } key={ `${ service.name }-${ index }` }>
            { playable
              ? <video ref={ reelRef } src={ piece.src } poster={ piece.poster } muted loop playsInline preload="auto" />
              : <img src={ piece.type === 'video' ? piece.poster : piece.src } alt="" loading="lazy" decoding="async" /> }
          </figure>
        )
      } ) }
    </div>
  )
}

// Desire, ?tune draft: the six services on a flat drum. The section sticks for one screen while the
// scroll slides the column up past the centre line, one service per step. The row at the centre is
// active: lit, its detail shown, and its reel plays once the scroll settles while the drum is on screen.
// variant: 'drum-media' (names, with the active service's five-piece strip beside them), 'drum-cards' (each row
// carries its own five-piece strip).
export function ServicesDrum( { variant } ) {
  const rootRef = useRef( null )
  const reelRef = useRef( null )
  const [ activeIndex, setActiveIndex ] = useState( 0 )
  // The row whose <video> is mounted. It only catches up to activeIndex once the scroll rests, so a
  // video is never created or decoded mid-scroll (that was the phone lag).
  const [ reelIndex, setReelIndex ] = useState( 0 )
  // Playback state lives in a ref, so scroll frames never re-render the drum.
  const playback = useRef( { allowed: true, inView: false, scrolling: false, timer: 0 } )

  // The one mounted reel plays only when playback is allowed, the drum is on screen, and the scroll is at rest.
  const syncPlayback = useCallback( () => {
    const video = reelRef.current
    if ( !video ) return
    const { allowed, inView, scrolling } = playback.current
    if ( allowed && inView && !scrolling ) video.play()?.catch( () => {} )
    else video.pause()
  }, [] )

  // A new active row mounts a new <video>; start it if it should be playing.
  useEffect( () => {
    syncPlayback()
  }, [ reelIndex, syncPlayback ] )

  useLayoutEffect( () => {
    const root = rootRef.current
    const windowEl = root.querySelector( '.drum-window' )
    const rows = [ ...root.querySelectorAll( '.drum-row' ) ]
    // Phone address-bar show/hide must not trigger a ScrollTrigger refresh (re-measure) mid-scroll.
    ScrollTrigger.config( { ignoreMobileResize: true } )
    const reduced = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches
    // Phones step between rows instead of scrubbing (same breakpoint as the phone CSS in index.css).
    const stepped = window.matchMedia( '(max-width: 767px)' ).matches
    root.classList.toggle( 'is-stepped', stepped && !reduced )
    const state = playback.current
    let rowPx = 0
    let active = 0
    state.allowed = !reduced
    state.scrolling = false

    // Row pitch: the tallest row plus the column gap, so rows never overlap.
    const measure = () => {
      const gap = parseFloat( window.getComputedStyle( windowEl ).rowGap ) || 0
      rowPx = Math.max( ...rows.map( ( row ) => row.offsetHeight ) ) + gap
    }

    // Re-renders only when the centre row changes (about six times in a run), not on every frame.
    const setActive = ( next ) => {
      if ( next === active ) return
      active = next
      // The reel stops as soon as the title changes; the next reel waits for the scroll to settle.
      reelRef.current?.pause()
      setActiveIndex( next )
    }

    // Places every row for a turn (fractional row index at the centre line). Rows fully faded out keep their
    // old transform unless `all` is set (stepped mode needs every row placed so its CSS transition is right).
    const placeRows = ( turn, all ) => {
      rows.forEach( ( row, index ) => {
        const { y, opacity } = flatDrumRow( index - turn, { rowPx, visible: VISIBLE_ROWS } )
        if ( opacity === 0 && !all ) {
          if ( row.style.opacity !== '0' ) row.style.opacity = '0'
          return
        }
        row.style.transform = `translate3d(0, calc(-50% + ${ y }px), 0)`
        row.style.opacity = opacity
      } )
    }

    // Desktop: rows track the scroll continuously. Phones (stepped): JS writes the row styles only when the
    // centre row changes, and a CSS transition glides them to their new slots on the compositor. Moving rows from
    // scroll events lags the native touch scroll by a frame or more, which read as ~30fps on phones.
    const render = ( progress, force ) => {
      const next = flatDrumActive( progress, rows.length )
      if ( !stepped ) placeRows( progress * ( rows.length - 1 ), false )
      else if ( force || next !== active ) placeRows( next, true )
      setActive( next )
    }

    // The reel pauses for the length of each scroll and resumes once the scroll has rested for SETTLE_MS.
    const pauseWhileScrolling = () => {
      // Pause once per scroll burst, not on every frame.
      if ( !state.scrolling ) {
        state.scrolling = true
        syncPlayback()
      }
      window.clearTimeout( state.timer )
      state.timer = window.setTimeout( () => {
        state.scrolling = false
        setReelIndex( active )
        syncPlayback()
      }, SETTLE_MS )
    }

    // Reel playback only while the drum is on screen.
    const viewTrigger = ScrollTrigger.create( {
      trigger: root,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: ( self ) => {
        state.inView = self.isActive
        // The phone nav goes solid while the drum is on screen (body.drum-in-view rule in index.css).
        document.body.classList.toggle( 'drum-in-view', self.isActive )
        syncPlayback()
      },
    } )

    // Reduced motion: a plain list (CSS), the first service active, no scroll-driven slide and no autoplay.
    if ( reduced ) {
      return () => {
        viewTrigger.kill()
        document.body.classList.remove( 'drum-in-view' )
        reelRef.current?.pause()
      }
    }

    measure()
    const slideTrigger = ScrollTrigger.create( {
      trigger: root,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: ( self ) => {
        render( self.progress )
        pauseWhileScrolling()
      },
      onRefresh: ( self ) => {
        measure()
        render( self.progress, true )
      },
    } )
    render( slideTrigger.progress, true )

    return () => {
      window.clearTimeout( state.timer )
      slideTrigger.kill()
      viewTrigger.kill()
      document.body.classList.remove( 'drum-in-view' )
      root.classList.remove( 'is-stepped' )
      state.inView = false
      reelRef.current?.pause()
    }
  }, [ variant, syncPlayback ] )

  return (
    <section
      className={ `services-drum is-${ variant }` }
      style={ { '--drum-rows': SERVICES.length } }
      aria-labelledby="services-title"
      ref={ rootRef }
    >
      <div className="drum-stage">
        <h2 id="services-title" className="section-title drum-title">Our Services</h2>
        <div className="drum-body">
          <ol className="drum-window" aria-label="Services">
            { SERVICES.map( ( service, index ) => {
              const isActive = index === activeIndex
              return (
                <li className={ `drum-row${ isActive ? ' is-active' : '' }` } key={ service.name }>
                  <span className="drum-text">
                    <span className="drum-name">{ service.name }</span>
                    <span className="drum-detail">{ service.detail }</span>
                  </span>
                  { variant === 'drum-cards' && <MediaStrip service={ service } hasReel={ index === reelIndex } reelRef={ reelRef } /> }
                </li>
              )
            } ) }
          </ol>
          { variant === 'drum-media' && (
            <MediaStrip key={ SERVICES[ activeIndex ].name } service={ SERVICES[ activeIndex ] } hasReel={ activeIndex === reelIndex } reelRef={ reelRef } />
          ) }
        </div>
      </div>
    </section>
  )
}
