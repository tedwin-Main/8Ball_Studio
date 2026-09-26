import test from 'node:test'
import assert from 'node:assert/strict'
import { createStoryNavigation } from './storyNavigation.js'

const PAGES = [
  { id: 'intro', label: 'Intro', startProgress: 0, targetProgress: 0 },
  { id: 'studio', label: 'Studio', startProgress: 0.2, targetProgress: 0.3 },
  { id: 'projects', label: 'Projects', startProgress: 0.6, targetProgress: 0.65 },
  { id: 'contact', label: 'Contact', startProgress: 0.85, targetProgress: 0.95 },
]

class FakeAdapter
{
  constructor ( position = 0 )
  {
    this.position = position
    this.scrollListeners = new Set()
    this.virtualScroll = null
    this.scrollCalls = []
    this.pendingCompletion = null
    this.refreshCount = 0
    this.updateCount = 0
    this.cancelCount = 0
    this.syncCount = 0
    this.destroyed = false
  }

  // Like Lenis, a cancelled glide never reports completion by itself; pendingCompletion is kept so a
  // test can fire the stale completion and prove it is ignored.
  syncLimits ()
  {
    this.syncCount += 1
  }

  cancelGlide ()
  {
    this.cancelCount += 1
  }

  getScrollPosition ()
  {
    return this.position
  }

  scrollTo ( targetY, options = {} )
  {
    this.position = targetY
    this.scrollCalls.push( { targetY, options } )
    if ( options.immediate ) this.emitScroll()
    else this.pendingCompletion = options.onComplete
  }

  complete ()
  {
    const completion = this.pendingCompletion
    this.pendingCompletion = null
    completion?.()
    this.emitScroll()
  }

  emitScroll ()
  {
    this.scrollListeners.forEach( ( listener ) => listener() )
  }

  onScroll ( listener )
  {
    this.scrollListeners.add( listener )
    return () => this.scrollListeners.delete( listener )
  }

  onVirtualScroll ( listener )
  {
    this.virtualScroll = listener
    return () =>
    {
      if ( this.virtualScroll === listener ) this.virtualScroll = null
    }
  }

  refresh ()
  {
    this.refreshCount += 1
  }

  update ()
  {
    this.updateCount += 1
  }

  destroy ()
  {
    this.destroyed = true
    this.scrollListeners.clear()
    this.virtualScroll = null
  }
}

class FakeEventTarget
{
  constructor ()
  {
    this.listeners = new Map()
  }

  addEventListener ( type, listener )
  {
    const listeners = this.listeners.get( type ) || new Set()
    listeners.add( listener )
    this.listeners.set( type, listeners )
  }

  removeEventListener ( type, listener )
  {
    this.listeners.get( type )?.delete( listener )
  }

  dispatch ( type, event )
  {
    this.listeners.get( type )?.forEach( ( listener ) => listener( event ) )
  }

  listenerCount ( type )
  {
    return this.listeners.get( type )?.size || 0
  }
}

class FakeClock
{
  constructor ()
  {
    this.nowValue = 0
    this.nextId = 1
    this.timers = new Map()
  }

  now ()
  {
    return this.nowValue
  }

  setTimeout ( callback, delay )
  {
    const id = this.nextId
    this.nextId += 1
    this.timers.set( id, { callback, due: this.nowValue + delay } )
    return id
  }

  clearTimeout ( id )
  {
    this.timers.delete( id )
  }

  advance ( duration )
  {
    this.nowValue += duration
    const due = [ ...this.timers.entries() ].filter( ( [ , timer ] ) => timer.due <= this.nowValue )
    due.forEach( ( [ id, timer ] ) =>
    {
      this.timers.delete( id )
      timer.callback()
    } )
  }
}

const createFixture = ( options = {} ) =>
{
  const adapter = options.adapter || new FakeAdapter( options.position || 0 )
  const eventTarget = options.eventTarget || new FakeEventTarget()
  const clock = options.clock || new FakeClock()
  let range = 1000
  const changedPages = []
  const indicatorPages = []
  const transitionStates = []
  const navigation = createStoryNavigation( {
    pages: PAGES,
    initialPage: 'intro',
    adapter,
    eventTarget,
    clock,
    getMetrics: () => ( { top: 0, range, viewport: 200 } ),
    transitionFor: () => ( { duration: 1 } ),
    gestureThresholdPx: 14,
    gestureResetMs: 120,
    prefersReducedMotion: options.prefersReducedMotion || ( () => false ),
    autoplaySpan: options.autoplaySpan || null,
    isLayoutResize: options.isLayoutResize,
    onPageChange: ( page ) => changedPages.push( page ),
    onIndicatorPageChange: ( page ) => indicatorPages.push( page ),
    onTransitionChange: ( isTransitioning ) => transitionStates.push( isTransitioning ),
  } )

  navigation.mount()
  return {
    adapter,
    eventTarget,
    clock,
    navigation,
    changedPages,
    indicatorPages,
    transitionStates,
    setRange: ( nextRange ) => { range = nextRange },
  }
}

const wheelEvent = ( deltaY ) =>
{
  let prevented = false
  return {
    event: {
      type: 'wheel',
      cancelable: true,
      preventDefault: () => { prevented = true },
    },
    wasPrevented: () => prevented,
  }
}

test( 'mount selects nearest Stable page from current progress without autoplay', () =>
{
  const fixture = createFixture( { position: 700 } )

  assert.equal( fixture.navigation.getState().activePage, 'projects' )
  assert.deepEqual( fixture.changedPages, [ 'projects' ] )
  assert.deepEqual( fixture.transitionStates, [] )
} )

test( 'page navigation locks input until adapter completion and settles by Page id', () =>
{
  const fixture = createFixture()
  const started = fixture.navigation.goToPage( 'studio' )

  assert.equal( started, true )
  assert.equal( fixture.navigation.getState().activePage, 'intro' )
  assert.equal( fixture.navigation.getState().targetPage, 'studio' )
  assert.equal( fixture.navigation.getState().isTransitioning, true )
  assert.deepEqual( fixture.transitionStates, [ true ] )

  const input = wheelEvent( 20 )
  assert.equal( fixture.adapter.virtualScroll( { deltaY: 20, event: input.event } ), false )
  assert.equal( input.wasPrevented(), true )

  fixture.adapter.complete()
  assert.equal( fixture.navigation.getState().activePage, 'studio' )
  assert.equal( fixture.navigation.getState().isTransitioning, false )
  assert.deepEqual( fixture.changedPages, [ 'intro', 'studio' ] )
  assert.deepEqual( fixture.transitionStates, [ true, false ] )
} )

test( 'visitor indicator follows the visible Page boundary during forward autoplay', () =>
{
  const fixture = createFixture()
  fixture.navigation.goToPage( 'studio' )

  // Stable Page state remains locked until completion, while the indicator follows
  // the same activation threshold that starts the Studio reveal.
  assert.equal( fixture.navigation.getState().activePage, 'intro' )
  assert.equal( fixture.navigation.getState().indicatorPage, 'intro' )
  fixture.adapter.position = 210
  fixture.adapter.emitScroll()

  assert.equal( fixture.navigation.getState().activePage, 'intro' )
  assert.equal( fixture.navigation.getState().indicatorPage, 'studio' )
  assert.deepEqual( fixture.indicatorPages, [ 'intro', 'studio' ] )

  fixture.adapter.complete()
  assert.equal( fixture.navigation.getState().activePage, 'studio' )
  assert.equal( fixture.navigation.getState().indicatorPage, 'studio' )
} )

test( 'visitor indicator returns at the same boundary during reverse autoplay', () =>
{
  const fixture = createFixture( { position: 300 } )
  fixture.navigation.goToPage( 'intro' )

  assert.equal( fixture.navigation.getState().activePage, 'studio' )
  assert.equal( fixture.navigation.getState().indicatorPage, 'studio' )
  fixture.adapter.position = 150
  fixture.adapter.emitScroll()

  assert.equal( fixture.navigation.getState().activePage, 'studio' )
  assert.equal( fixture.navigation.getState().indicatorPage, 'intro' )
  assert.deepEqual( fixture.indicatorPages, [ 'studio', 'intro' ] )

  fixture.adapter.complete()
  assert.equal( fixture.navigation.getState().activePage, 'intro' )
  assert.equal( fixture.navigation.getState().indicatorPage, 'intro' )
} )

test( 'free scroll passes wheel input through and Stable page follows the scroll position', () =>
{
  const fixture = createFixture()
  const wheel = wheelEvent( 40 )

  // Input is not qualified into a Page jump: the scroller owns it and nothing is prevented.
  assert.equal( fixture.adapter.virtualScroll( { deltaY: 40, event: wheel.event } ), true )
  assert.equal( wheel.wasPrevented(), false )
  assert.equal( fixture.adapter.scrollCalls.length, 0 )

  // Scrolling freely past a Page boundary makes that Page stable without any autoplay.
  fixture.adapter.position = 700
  fixture.adapter.emitScroll()
  assert.equal( fixture.navigation.getState().activePage, 'projects' )
  assert.deepEqual( fixture.transitionStates, [] )
} )

test( 'free scroll still glides to a requested Page and locks input during that glide', () =>
{
  const fixture = createFixture()
  fixture.navigation.goToPage( 'contact' )
  const wheel = wheelEvent( 40 )

  assert.equal( fixture.adapter.virtualScroll( { deltaY: 40, event: wheel.event } ), false )
  fixture.adapter.complete()
  assert.equal( fixture.navigation.getState().activePage, 'contact' )
  assert.equal( fixture.adapter.virtualScroll( { deltaY: 40, event: wheelEvent( 40 ).event } ), true )
} )

test( 'requesting the current Page from partway down glides back to its target', () =>
{
  // Normal-scroll sections: scrolled 50px past Projects' top is still the Projects Page.
  const fixture = createFixture( { position: 700 } )
  assert.equal( fixture.navigation.getState().activePage, 'projects' )

  assert.equal( fixture.navigation.goToPage( 'projects' ), true )
  assert.equal( fixture.adapter.scrollCalls.length, 1 )
  assert.equal( fixture.adapter.scrollCalls[ 0 ].targetY, 650 )
  fixture.adapter.complete()

  // At the target already: a repeat request is a no-op.
  fixture.adapter.position = 650
  assert.equal( fixture.navigation.goToPage( 'projects' ), true )
  assert.equal( fixture.adapter.scrollCalls.length, 1 )
} )

const keyEvent = ( key, { target = {}, shiftKey = false } = {} ) =>
{
  let prevented = false
  return {
    event: { key, shiftKey, target, cancelable: true, preventDefault: () => { prevented = true } },
    wasPrevented: () => prevented,
  }
}

test( 'keyboard navigation ignores editable targets and prevents handled keys', () =>
{
  const fixture = createFixture()
  fixture.eventTarget.dispatch( 'keydown', keyEvent( 'PageDown', { target: { isContentEditable: true } } ).event )
  assert.equal( fixture.adapter.scrollCalls.length, 0 )

  const pageDown = keyEvent( 'PageDown' )
  fixture.eventTarget.dispatch( 'keydown', pageDown.event )
  assert.equal( pageDown.wasPrevented(), true )
  assert.equal( fixture.navigation.getState().targetPage, 'studio' )
} )

test( 'arrows and Space scroll natively outside the autoplay span; the Page keys glide', () =>
{
  // Projects' run lives between Page targets: native keys must be able to reach it.
  const fixture = createFixture( { position: 650 } )
  for ( const [ key, shiftKey ] of [ [ 'ArrowDown', false ], [ 'ArrowUp', false ], [ ' ', false ], [ ' ', true ] ] )
  {
    const press = keyEvent( key, { shiftKey } )
    fixture.eventTarget.dispatch( 'keydown', press.event )
    assert.equal( press.wasPrevented(), false, `${key}${shiftKey ? ' + Shift' : ''} scrolls natively` )
  }
  assert.equal( fixture.adapter.scrollCalls.length, 0 )

  const pageDown = keyEvent( 'PageDown' )
  fixture.eventTarget.dispatch( 'keydown', pageDown.event )
  assert.equal( pageDown.wasPrevented(), true )
  assert.equal( fixture.adapter.scrollCalls.at( -1 ).targetY, 950 )
} )

test( 'Space on a focused button is left to the button', () =>
{
  const fixture = createFixture( { autoplaySpan: { from: 'intro', to: 'studio' } } )
  // Only the pressable-control selector matches, as for a real <button>.
  const button = { matches: ( selector ) => selector.startsWith( 'button' ) }
  const press = keyEvent( ' ', { target: button } )
  fixture.eventTarget.dispatch( 'keydown', press.event )

  assert.equal( press.wasPrevented(), false )
  assert.equal( fixture.adapter.scrollCalls.length, 0 )
  assert.equal( fixture.navigation.getState().targetPage, 'intro' )
} )

test( 'input against a glide stops it where it is, and the page scrolls freely from there', () =>
{
  const fixture = createFixture()
  fixture.navigation.goToPage( 'contact' )
  fixture.adapter.position = 400

  // Below the gesture threshold the glide keeps the page.
  const nudge = wheelEvent( -10 )
  assert.equal( fixture.adapter.virtualScroll( { deltaY: -10, event: nudge.event } ), false )
  assert.equal( nudge.wasPrevented(), true )

  fixture.clock.advance( 16 )
  const against = wheelEvent( -10 )
  assert.equal( fixture.adapter.virtualScroll( { deltaY: -10, event: against.event } ), true )
  assert.equal( against.wasPrevented(), false )
  assert.equal( fixture.adapter.cancelCount, 1 )
  assert.equal( fixture.navigation.getState().isTransitioning, false )
  assert.equal( fixture.navigation.getState().activePage, 'studio' )
  assert.deepEqual( fixture.transitionStates, [ true, false ] )

  // The cancelled glide's completion and its safety timer can no longer settle the Story on Contact.
  fixture.adapter.complete()
  fixture.clock.advance( 5000 )
  assert.equal( fixture.navigation.getState().activePage, 'studio' )
} )

test( 'resize preserves normalized progress after metrics change', () =>
{
  const fixture = createFixture( { position: 400 } )
  fixture.navigation.seekProgress( 0.4 )
  fixture.setRange( 2000 )
  fixture.eventTarget.dispatch( 'resize', {} )
  fixture.clock.advance( 150 )

  assert.equal( fixture.adapter.refreshCount, 1 )
  assert.equal( fixture.adapter.position, 800 )
  assert.equal( fixture.adapter.updateCount, 1 )

  // A responsive timeline may rewrite the pixel position after refresh; the guard
  // restore must put the same normalized Story position back without another refresh.
  fixture.adapter.position = 0
  fixture.clock.advance( 320 )
  assert.equal( fixture.adapter.position, 800 )
  assert.equal( fixture.adapter.refreshCount, 1 )
} )

test( 'reduced motion settles immediately through the same Page rules', () =>
{
  const fixture = createFixture( { prefersReducedMotion: () => true } )
  assert.equal( fixture.navigation.goToPage( 'contact' ), true )
  assert.equal( fixture.navigation.getState().activePage, 'contact' )
  assert.equal( fixture.navigation.getState().isTransitioning, false )
  assert.deepEqual( fixture.transitionStates, [] )
  assert.equal( fixture.adapter.scrollCalls[ 0 ].options.immediate, true )
} )

test( 'destroy removes handlers, timers, and adapter work', () =>
{
  const fixture = createFixture()
  fixture.navigation.goToPage( 'studio' )
  assert.equal( fixture.eventTarget.listenerCount( 'keydown' ), 1 )
  assert.equal( fixture.eventTarget.listenerCount( 'resize' ), 1 )

  fixture.navigation.destroy()
  assert.equal( fixture.eventTarget.listenerCount( 'keydown' ), 0 )
  assert.equal( fixture.eventTarget.listenerCount( 'resize' ), 0 )
  assert.equal( fixture.adapter.destroyed, true )
  fixture.clock.advance( 5000 )
  assert.equal( fixture.navigation.getState().isTransitioning, true )
} )

// Intro autoplay: free scroll everywhere, but one gesture on the Intro plays the break to Studio.
const createAutoplayFixture = ( position = 0 ) => createFixture( { autoplaySpan: { from: 'intro', to: 'studio' }, position } )

test( 'autoplay span: one wheel gesture on the Intro glides the whole way to Studio', () =>
{
  const fixture = createAutoplayFixture()

  // Below the intent threshold the page is held still, and nothing glides yet.
  const nudge = wheelEvent( 6 )
  assert.equal( fixture.adapter.virtualScroll( { deltaY: 6, event: nudge.event } ), false )
  assert.equal( nudge.wasPrevented(), true )
  assert.equal( fixture.adapter.scrollCalls.length, 0 )

  fixture.clock.advance( 16 )
  assert.equal( fixture.adapter.virtualScroll( { deltaY: 10, event: wheelEvent( 10 ).event } ), false )
  assert.equal( fixture.adapter.scrollCalls.length, 1 )
  assert.equal( fixture.adapter.scrollCalls[ 0 ].targetY, 300 )
  assert.equal( fixture.navigation.getState().targetPage, 'studio' )
  assert.equal( fixture.navigation.isTransitioning, true )
} )

test( 'autoplay span: the rest of the gesture is swallowed, then Studio scrolls freely', () =>
{
  const fixture = createAutoplayFixture()
  fixture.adapter.virtualScroll( { deltaY: 40, event: wheelEvent( 40 ).event } )
  fixture.clock.advance( 16 )
  // Trackpad inertia during the glide is locked out.
  assert.equal( fixture.adapter.virtualScroll( { deltaY: 30, event: wheelEvent( 30 ).event } ), false )
  fixture.adapter.complete()
  assert.equal( fixture.navigation.getState().activePage, 'studio' )

  // The same burst carrying on after the glide lands is still swallowed.
  fixture.clock.advance( 16 )
  const tail = wheelEvent( 20 )
  assert.equal( fixture.adapter.virtualScroll( { deltaY: 20, event: tail.event } ), false )
  assert.equal( tail.wasPrevented(), true )

  // A fresh gesture down from Studio is free scroll.
  fixture.clock.advance( 500 )
  const next = wheelEvent( 20 )
  assert.equal( fixture.adapter.virtualScroll( { deltaY: 20, event: next.event } ), true )
  assert.equal( next.wasPrevented(), false )
  assert.equal( fixture.adapter.scrollCalls.length, 1 )
} )

test( 'autoplay span: a deliberate gesture up from Studio plays the break back to the Intro', () =>
{
  const fixture = createAutoplayFixture( 300 )
  assert.equal( fixture.navigation.getState().activePage, 'studio' )

  // One swipe: the page holds at Studio until the swipe has moved 120px, then rewinds.
  for ( let i = 0; i < 2; i++ )
  {
    assert.equal( fixture.adapter.virtualScroll( { deltaY: -40, event: wheelEvent( -40 ).event } ), false )
    assert.equal( fixture.adapter.scrollCalls.length, 0 )
    fixture.clock.advance( 16 )
  }
  assert.equal( fixture.adapter.virtualScroll( { deltaY: -40, event: wheelEvent( -40 ).event } ), false )
  assert.equal( fixture.adapter.scrollCalls.at( -1 ).targetY, 0 )
  assert.equal( fixture.navigation.getState().targetPage, 'intro' )
} )

test( 'autoplay span: a stray nudge up at Studio never rewinds; close notches add up to one', () =>
{
  const fixture = createAutoplayFixture( 300 )
  const up = ( delta ) =>
  {
    const input = wheelEvent( delta )
    const result = fixture.adapter.virtualScroll( { deltaY: delta, event: input.event } )
    return { result, prevented: input.wasPrevented() }
  }

  // Trackpad drift after landing: held still at Studio, no rewind.
  assert.deepEqual( up( -80 ), { result: false, prevented: true } )
  // A pause longer than the memory window forgets it.
  fixture.clock.advance( 1000 )
  assert.deepEqual( up( -80 ), { result: false, prevented: true } )
  assert.equal( fixture.adapter.scrollCalls.length, 0 )

  // Any downward input clears it too.
  fixture.clock.advance( 300 )
  assert.equal( fixture.adapter.virtualScroll( { deltaY: 10, event: wheelEvent( 10 ).event } ), true )
  fixture.clock.advance( 300 )
  up( -80 )
  assert.equal( fixture.adapter.scrollCalls.length, 0 )

  // Two separate wheel notches close together are a deliberate rewind.
  fixture.clock.advance( 300 )
  up( -70 )
  assert.equal( fixture.adapter.scrollCalls.at( -1 ).targetY, 0 )
  assert.equal( fixture.navigation.getState().targetPage, 'intro' )
} )

test( 'autoplay span: input against the break glide turns it around, never leaving it half-played', () =>
{
  const fixture = createAutoplayFixture()
  fixture.adapter.virtualScroll( { deltaY: 40, event: wheelEvent( 40 ).event } )
  assert.equal( fixture.adapter.scrollCalls.at( -1 ).targetY, 300 )

  // Halfway through the break the visitor scrolls up: the glide heads back to the Intro, taking
  // the matching share of its time.
  fixture.adapter.position = 150
  fixture.clock.advance( 200 )
  const against = wheelEvent( -20 )
  assert.equal( fixture.adapter.virtualScroll( { deltaY: -20, event: against.event } ), false )
  assert.equal( against.wasPrevented(), true )
  assert.equal( fixture.adapter.scrollCalls.at( -1 ).targetY, 0 )
  assert.equal( fixture.adapter.scrollCalls.at( -1 ).options.duration, 0.5 )
  assert.equal( fixture.navigation.getState().targetPage, 'intro' )
  assert.equal( fixture.navigation.isTransitioning, true )
  assert.equal( fixture.adapter.cancelCount, 0 )

  // The rest of that upward flick runs along the new glide: locked.
  fixture.clock.advance( 16 )
  assert.equal( fixture.adapter.virtualScroll( { deltaY: -30, event: wheelEvent( -30 ).event } ), false )
  assert.equal( fixture.adapter.scrollCalls.length, 2 )

  fixture.adapter.complete()
  assert.equal( fixture.navigation.getState().activePage, 'intro' )
} )

test( 'autoplay span: arrows and Space play the break both ways instead of scrubbing it', () =>
{
  const press = ( fixture, key, shiftKey = false ) =>
  {
    const input = keyEvent( key, { shiftKey } )
    fixture.eventTarget.dispatch( 'keydown', input.event )
    return input.wasPrevented()
  }

  const intro = createAutoplayFixture( 0 )
  assert.equal( press( intro, 'ArrowDown' ), true )
  assert.equal( intro.adapter.scrollCalls.at( -1 ).targetY, 300 )

  const studio = createAutoplayFixture( 300 )
  assert.equal( press( studio, 'ArrowUp' ), true )
  assert.equal( studio.adapter.scrollCalls.at( -1 ).targetY, 0 )

  // Just below Studio, a key step up that would land inside the break settles on Studio.
  const belowByArrow = createAutoplayFixture( 320 )
  assert.equal( press( belowByArrow, 'ArrowUp' ), true )
  assert.equal( belowByArrow.adapter.scrollCalls.at( -1 ).targetY, 300 )
  const belowBySpace = createAutoplayFixture( 400 )
  assert.equal( press( belowBySpace, ' ', true ), true )
  assert.equal( belowBySpace.adapter.scrollCalls.at( -1 ).targetY, 300 )

  // Further down, the same keys scroll natively.
  const further = createAutoplayFixture( 600 )
  assert.equal( press( further, 'ArrowUp' ), false )
  assert.equal( press( further, ' ', true ), false )
  assert.equal( further.adapter.scrollCalls.length, 0 )
} )

test( 'autoplay span: a flick up from Projects that would reach the break stops on Studio', () =>
{
  const fixture = createAutoplayFixture( 700 )

  // Short of the span: free scroll.
  assert.equal( fixture.adapter.virtualScroll( { deltaY: -100, event: wheelEvent( -100 ).event } ), true )
  fixture.clock.advance( 16 )
  // Carrying into it: glide to Studio instead of half-scrubbing the break.
  assert.equal( fixture.adapter.virtualScroll( { deltaY: -500, event: wheelEvent( -500 ).event } ), false )
  assert.equal( fixture.adapter.scrollCalls.at( -1 ).targetY, 300 )
  assert.equal( fixture.navigation.getState().targetPage, 'studio' )
} )

test( 'autoplay span: one swipe on the Intro glides to Studio; taps pass through', () =>
{
  const fixture = createAutoplayFixture()
  const touch = ( type, y ) =>
  {
    let prevented = false
    return {
      event: { type, cancelable: true, touches: type === 'touchend' ? [] : [ { clientY: y } ], preventDefault: () => { prevented = true } },
      wasPrevented: () => prevented,
    }
  }

  const start = touch( 'touchstart', 500 )
  assert.equal( fixture.adapter.virtualScroll( { deltaY: 0, event: start.event } ), true )
  assert.equal( start.wasPrevented(), false )

  const move = touch( 'touchmove', 480 )
  assert.equal( fixture.adapter.virtualScroll( { deltaY: 0, event: move.event } ), false )
  assert.equal( move.wasPrevented(), true )
  assert.equal( fixture.adapter.scrollCalls.at( -1 ).targetY, 300 )
} )

test( 'a mobile address-bar resize only syncs the scroll limit: no refresh, no position restore', () =>
{
  const fixture = createFixture( { position: 400, isLayoutResize: () => false } )
  fixture.eventTarget.dispatch( 'resize', {} )
  fixture.clock.advance( 1000 )

  assert.equal( fixture.adapter.syncCount, 1 )
  assert.equal( fixture.adapter.refreshCount, 0 )
  assert.equal( fixture.adapter.scrollCalls.length, 0 )
} )

test( 'a touch pulling past the top or the bottom is held still (no rubber band)', () =>
{
  const touchMove = ( deltaY ) =>
  {
    let prevented = false
    const event = { type: 'touchmove', cancelable: true, touches: [ { clientY: 300 } ], preventDefault: () => { prevented = true } }
    return { event, deltaY, wasPrevented: () => prevented }
  }
  const top = createFixture( { position: 0 } )
  const pullDown = touchMove( -30 )
  assert.equal( top.adapter.virtualScroll( { deltaY: pullDown.deltaY, event: pullDown.event } ), false )
  assert.equal( pullDown.wasPrevented(), true )

  const bottom = createFixture( { position: 1000 } )
  const pushUp = touchMove( 30 )
  assert.equal( bottom.adapter.virtualScroll( { deltaY: pushUp.deltaY, event: pushUp.event } ), false )
  assert.equal( pushUp.wasPrevented(), true )

  // Inside the Story a touch scrolls freely.
  const middle = createFixture( { position: 700 } )
  const move = touchMove( 30 )
  assert.equal( middle.adapter.virtualScroll( { deltaY: move.deltaY, event: move.event } ), true )
  assert.equal( move.wasPrevented(), false )
} )
