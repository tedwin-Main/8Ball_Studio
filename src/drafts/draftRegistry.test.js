import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DRAFT_CONFIGS,
  DRAFT_IDS,
  normalizeDraftId,
  getDraftOptions,
  getDraftConfig,
} from './draftRegistry.js'

test( 'draftRegistry exports consolidated active drafts', () =>
{
  assert.deepEqual( DRAFT_IDS, [ 'cinematic', 'photoreal', 'original' ] )
  assert.equal( Object.keys( DRAFT_CONFIGS ).length, 3 )
} )

test( 'normalizeDraftId handles direct IDs, aliases, and invalid fallbacks', () =>
{
  assert.equal( normalizeDraftId( 'cinematic' ), 'cinematic' )
  assert.equal( normalizeDraftId( 'photoreal' ), 'photoreal' )
  assert.equal( normalizeDraftId( 'original' ), 'original' )

  // Legacy aliases map correctly
  assert.equal( normalizeDraftId( 'photo' ), 'cinematic' )
  assert.equal( normalizeDraftId( 'webgl' ), 'photoreal' )
  assert.equal( normalizeDraftId( 'classic' ), 'photoreal' )

  // Invalid / null
  assert.equal( normalizeDraftId( null ), 'cinematic' )
  assert.equal( normalizeDraftId( undefined ), 'cinematic' )
  assert.equal( normalizeDraftId( 'nonexistent' ), 'cinematic' )
} )

test( 'getDraftOptions returns labels and IDs for all drafts', () =>
{
  const options = getDraftOptions()
  assert.equal( options.length, 3 )
  assert.deepEqual( options.map( ( o ) => o.id ), DRAFT_IDS )
  assert.equal( options.find( ( o ) => o.id === 'photoreal' )?.label, '02 3D Break' )
} )

test( 'getDraftConfig returns correct fallback metadata', () =>
{
  assert.equal( getDraftConfig( 'photoreal' ).fallbackId, 'cinematic' )
  assert.equal( getDraftConfig( 'cinematic' ).fallbackId, null )
} )
