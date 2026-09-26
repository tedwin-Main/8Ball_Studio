import test from 'node:test'
import assert from 'node:assert/strict'
import { STORY_SETTINGS } from '../storyTiming.js'
import {
  REBUILD_KEYS,
  TUNING_DEFAULTS,
  TUNING_FIELDS,
  formatTuningForTiming,
  getTuning,
  resetTuning,
  setTuning,
  subscribeTuning,
} from './runtimeTuning.js'

test( 'tuning starts from STORY_SETTINGS, with one slider per setting', () =>
{
  assert.deepEqual( getTuning(), STORY_SETTINGS )
  assert.deepEqual( TUNING_FIELDS.map( ( field ) => field.key ), Object.keys( STORY_SETTINGS ) )
  assert.deepEqual( [ ...REBUILD_KEYS ], [ 'weight', 'depth' ] )
} )

test( 'setTuning merges finite known values, notifies subscribers, and resets', () =>
{
  const seen = []
  const unsubscribe = subscribeTuning( ( next, previous ) => seen.push( [ next.glide, previous.glide ] ) )

  setTuning( { glide: 0.09, bogus: 3, wheel: Number.NaN } )
  assert.equal( getTuning().glide, 0.09 )
  assert.equal( getTuning().wheel, STORY_SETTINGS.wheel )
  assert.equal( getTuning().bogus, undefined )
  assert.deepEqual( seen, [ [ 0.09, STORY_SETTINGS.glide ] ] )

  setTuning( { glide: 0.09 } )
  assert.equal( seen.length, 1 )

  resetTuning()
  assert.deepEqual( getTuning(), TUNING_DEFAULTS )
  unsubscribe()
} )

test( 'copied values paste straight into STORY_SETTINGS', () =>
{
  const text = formatTuningForTiming( { ...TUNING_DEFAULTS, glide: 0.06, skew: 5 } )
  assert.match( text, /^ {2}glide: 0\.06,$/m )
  assert.match( text, /^ {2}skew: 5,$/m )
} )
