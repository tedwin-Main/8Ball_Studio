import test from 'node:test'
import assert from 'node:assert/strict'
import { createDemandFrameScheduler } from './demandFrameScheduler.js'

const createFrameHarness = ( options = {} ) =>
{
  const callbacks = new Map()
  let nextHandle = 1
  const cancelled = []
  const renders = []

  const scheduler = createDemandFrameScheduler( {
    requestAnimationFrame ( callback )
    {
      const handle = nextHandle++
      callbacks.set( handle, callback )
      return handle
    },
    cancelAnimationFrame ( handle )
    {
      cancelled.push( handle )
      callbacks.delete( handle )
    },
    render ( frame )
    {
      renders.push( frame )
      options.render?.( frame )
    },
    shouldContinue: options.shouldContinue,
    active: options.active,
  } )

  const flush = ( timestamp = callbacks.size * 16.667 ) =>
  {
    const next = callbacks.entries().next()
    if ( next.done ) return false
    const [ handle, callback ] = next.value
    callbacks.delete( handle )
    callback( timestamp )
    return true
  }

  return { scheduler, callbacks, cancelled, renders, flush }
}

test( 'coalesces invalidations and renders the latest dirty state once per frame', () =>
{
  const harness = createFrameHarness()
  harness.scheduler.invalidate()
  harness.scheduler.invalidate()
  harness.scheduler.invalidate()

  assert.equal( harness.callbacks.size, 1 )
  harness.flush( 16 )

  assert.equal( harness.renders.length, 1 )
  assert.equal( harness.renders[ 0 ].dirty, true )
  assert.equal( harness.callbacks.size, 1 )
  assert.equal( harness.scheduler.isConfirmationPending, true )
} )

test( 'confirmation frame catches an invalidation arriving after a dirty paint', () =>
{
  const harness = createFrameHarness()
  harness.scheduler.invalidate()
  harness.flush( 16 )
  harness.scheduler.invalidate()
  harness.flush( 32 )

  assert.equal( harness.renders.length, 2 )
  assert.deepEqual( harness.renders.map( ( frame ) => frame.dirty ), [ true, true ] )
  assert.equal( harness.callbacks.size, 1 )
} )

test( 'settles after one bounded confirmation callback without painting an idle state', () =>
{
  const harness = createFrameHarness()
  harness.scheduler.invalidate()
  harness.flush( 16 )
  assert.equal( harness.scheduler.isConfirmationPending, true )

  harness.flush( 32 )

  assert.equal( harness.renders.length, 1 )
  assert.equal( harness.callbacks.size, 0 )
  assert.equal( harness.scheduler.isConfirmationPending, false )
} )

test( 'keeps renderer-specific continuation alive until it settles', () =>
{
  let remainingFrames = 3
  const harness = createFrameHarness( {
    shouldContinue: () => remainingFrames > 0,
    render: () => { remainingFrames -= 1 },
  } )

  harness.scheduler.invalidate()
  harness.flush( 16 )
  harness.flush( 32 )
  harness.flush( 48 )

  assert.equal( harness.renders.length, 3 )
  assert.equal( harness.renders[ 0 ].dirty, true )
  assert.equal( harness.renders[ 1 ].dirty, false )
  assert.equal( harness.renders[ 2 ].dirty, false )
  assert.equal( harness.callbacks.size, 0 )
} )

test( 'cancels inactive work and paints latest state on reactivation', () =>
{
  const harness = createFrameHarness()
  harness.scheduler.invalidate()
  assert.equal( harness.callbacks.size, 1 )

  harness.scheduler.setActive( false )
  assert.equal( harness.callbacks.size, 0 )
  assert.deepEqual( harness.cancelled, [ 1 ] )

  harness.scheduler.invalidate()
  assert.equal( harness.callbacks.size, 0 )
  harness.scheduler.setActive( true )
  assert.equal( harness.callbacks.size, 1 )
  harness.flush( 16 )

  assert.equal( harness.renders.length, 1 )
  assert.equal( harness.renders[ 0 ].dirty, true )
} )

test( 'destroy cancels pending work and ignores later invalidations', () =>
{
  const harness = createFrameHarness()
  harness.scheduler.invalidate()
  harness.scheduler.destroy()
  harness.scheduler.invalidate()

  assert.deepEqual( harness.cancelled, [ 1 ] )
  assert.equal( harness.callbacks.size, 0 )
  assert.equal( harness.renders.length, 0 )
  assert.equal( harness.scheduler.isDirty, false )
} )
