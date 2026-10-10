import test from 'node:test'
import assert from 'node:assert/strict'
import { DRAFT_CONFIGS, DRAFT_IDS, normalizeDraftId } from './draftRegistry.js'

test( 'the Intro has one draft: 01 3D POV', () =>
{
  assert.deepEqual( DRAFT_IDS, [ 'cinematic' ] )
  assert.equal( DRAFT_CONFIGS.cinematic.label, '01 3D POV' )
} )

test( 'normalizeDraftId falls back to the one draft, so retired drafts still render', () =>
{
  assert.equal( normalizeDraftId( 'cinematic' ), 'cinematic' )
  // Retired 02 (3D Break, photoreal) and 03 (Original) links, and the old aliases, show 01.
  assert.equal( normalizeDraftId( 'photoreal' ), 'cinematic' )
  assert.equal( normalizeDraftId( 'original' ), 'cinematic' )
  assert.equal( normalizeDraftId( 'webgl' ), 'cinematic' )
  assert.equal( normalizeDraftId( 'classic' ), 'cinematic' )
  assert.equal( normalizeDraftId( 'photo' ), 'cinematic' )
  assert.equal( normalizeDraftId( null ), 'cinematic' )
  assert.equal( normalizeDraftId( undefined ), 'cinematic' )
  assert.equal( normalizeDraftId( 'toString' ), 'cinematic' )
} )
