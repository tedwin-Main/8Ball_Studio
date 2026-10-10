import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ChartLineUp, Browser, ChatsCircle, PenNib, Sparkle, VideoCamera } from '@phosphor-icons/react'
import { SERVICES } from '../content'

const ICONS = [ VideoCamera, PenNib, ChartLineUp, ChatsCircle, Browser, Sparkle ]

// An endless row of the service names, with an icon between each. The track holds two copies and
// moves exactly one copy's width, so the loop never shows a gap.
export function Marquee() {
  const trackRef = useRef( null )

  useLayoutEffect( () => {
    // Reduced-motion visitors get a still row.
    if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) return undefined
    const tween = gsap.to( trackRef.current, { xPercent: -50, ease: 'none', duration: 28, repeat: -1 } )
    return () => tween.kill()
  }, [] )

  const row = SERVICES.map( ( service, index ) => {
    const Icon = ICONS[ index % ICONS.length ]
    return (
      <li key={ service.name }>
        <span>{ service.name }</span>
        <Icon size={ 56 } weight="light" aria-hidden="true" />
      </li>
    )
  } )

  return (
    <section className="marquee" aria-label="Services">
      <ul className="marquee-track" ref={ trackRef }>
        { row }
        { row.map( ( item, index ) => <li key={ `copy-${ index }` } aria-hidden="true">{ item.props.children }</li> ) }
      </ul>
    </section>
  )
}
