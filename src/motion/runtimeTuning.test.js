import test from 'node:test'
import assert from 'node:assert/strict'
import { STORY_TIMING } from '../storyTiming.js'
import {
  REBUILD_KEYS,
  TUNING_DEFAULTS,
  formatTuningForTiming,
  getTuning,
  resetTuning,
  setTuning,
  subscribeTuning,
} from './runtimeTuning.js'

test( 'tuning starts from the STORY_TIMING contract', () =>
{
  assert.equal( TUNING_DEFAULTS.lerp, STORY_TIMING.scroll.lerp )
  assert.equal( TUNING_DEFAULTS.wheelMultiplier, STORY_TIMING.scroll.wheelMultiplier )
  assert.equal( TUNING_DEFAULTS.scrubSeconds, STORY_TIMING.scroll.scrubSeconds )
  assert.equal( TUNING_DEFAULTS.sectionScrubSeconds, STORY_TIMING.scroll.sectionScrubSeconds )
  assert.equal( TUNING_DEFAULTS.skewMaxDeg, STORY_TIMING.flow.skewMaxDeg )
  assert.deepEqual( getTuning(), TUNING_DEFAULTS )
  assert.deepEqual( [ ...REBUILD_KEYS ], [ 'scrubSeconds', 'sectionScrubSeconds' ] )
} )

test( 'setTuning merges finite known values, notifies subscribers, and resets', () =>
{
  const seen = []
  const unsubscribe = subscribeTuning( ( next, previous ) => seen.push( [ next.lerp, previous.lerp ] ) )

  setTuning( { lerp: 0.09, bogus: 3, wheelMultiplier: Number.NaN } )
  assert.equal( getTuning().lerp, 0.09 )
  assert.equal( getTuning().wheelMultiplier, STORY_TIMING.scroll.wheelMultiplier )
  assert.equal( getTuning().bogus, undefined )
  assert.deepEqual( seen, [ [ 0.09, STORY_TIMING.scroll.lerp ] ] )

  // An unchanged value does not notify.
  setTuning( { lerp: 0.09 } )
  assert.equal( seen.length, 1 )

  resetTuning()
  assert.deepEqual( getTuning(), TUNING_DEFAULTS )
  unsubscribe()
} )

test( 'copied values paste straight into STORY_TIMING_DEFAULTS', () =>
{
  const text = formatTuningForTiming( { ...TUNING_DEFAULTS, lerp: 0.06, skewMaxDeg: 5 } )
  assert.match( text, /scroll: \{\n {4}lerp: 0\.06,/ )
  assert.match( text, /flow: \{\n {4}skewMaxDeg: 5,/ )
} )
