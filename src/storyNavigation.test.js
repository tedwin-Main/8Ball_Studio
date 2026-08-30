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
    this.destroyed = false
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
  const transitionStates = []
  const navigation = createStoryNavigation( {
    pages: PAGES,
    initialPage: 'intro',
    adapter,
    eventTarget,
    clock,
    getMetrics: () => ( { top: 0, range } ),
    transitionFor: () => ( { duration: 1 } ),
    gestureThresholdPx: 14,
    gestureResetMs: 120,
    prefersReducedMotion: options.prefersReducedMotion || ( () => false ),
    onPageChange: ( page ) => changedPages.push( page ),
    onTransitionChange: ( isTransitioning ) => transitionStates.push( isTransitioning ),
  } )

  navigation.mount()
  return {
    adapter,
    eventTarget,
    clock,
    navigation,
    changedPages,
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

test( 'wheel qualification advances once and direction changes reset accumulated intent', () =>
{
  const fixture = createFixture()
  const first = wheelEvent( 8 )
  const second = wheelEvent( 6 )

  assert.equal( fixture.adapter.virtualScroll( { deltaY: 8, event: first.event } ), true )
  assert.equal( fixture.adapter.virtualScroll( { deltaY: 6, event: second.event } ), false )
  assert.equal( fixture.navigation.getState().targetPage, 'studio' )
  assert.equal( fixture.adapter.scrollCalls.length, 1 )

  fixture.adapter.complete()
  const reversed = wheelEvent( -20 )
  assert.equal( fixture.adapter.virtualScroll( { deltaY: -20, event: reversed.event } ), false )
  assert.equal( fixture.navigation.getState().targetPage, 'intro' )
} )

test( 'touch reversal starts a fresh intent and advances at most one Page', () =>
{
  const fixture = createFixture( { position: 300 } )
  const touch = ( type, y ) => ( {
    type,
    touches: type === 'touchend' ? [] : [ { clientY: y } ],
    changedTouches: [ { clientY: y } ],
    cancelable: true,
    preventDefault: () => {},
  } )

  fixture.adapter.virtualScroll( { event: touch( 'touchstart', 100 ), deltaY: 0 } )
  fixture.adapter.virtualScroll( { event: touch( 'touchmove', 90 ), deltaY: 0 } )
  assert.equal(
    fixture.adapter.virtualScroll( { event: touch( 'touchmove', 115 ), deltaY: 0 } ),
    false,
  )
  assert.equal( fixture.navigation.getState().targetPage, 'intro' )
  fixture.adapter.complete()
  assert.equal( fixture.navigation.getState().activePage, 'intro' )
} )

test( 'keyboard navigation ignores editable targets and prevents handled keys', () =>
{
  const fixture = createFixture()
  const editable = {
    key: 'ArrowDown',
    target: { isContentEditable: true },
    cancelable: true,
    preventDefault: () => {},
  }
  fixture.eventTarget.dispatch( 'keydown', editable )
  assert.equal( fixture.adapter.scrollCalls.length, 0 )

  let prevented = false
  fixture.eventTarget.dispatch( 'keydown', {
    key: 'ArrowDown',
    target: {},
    cancelable: true,
    preventDefault: () => { prevented = true },
  } )
  assert.equal( prevented, true )
  assert.equal( fixture.navigation.getState().targetPage, 'studio' )
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
