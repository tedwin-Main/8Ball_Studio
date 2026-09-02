import test from 'node:test'
import assert from 'node:assert/strict'
import { LIGHTING_CONTRACT, MATERIAL_CONTRACT, QUALITY_CONTRACT } from './renderContracts.js'

test( 'shared ball contract stays inside the production clearcoat range', () =>
{
  assert.ok( MATERIAL_CONTRACT.ball.roughness >= 0.14 && MATERIAL_CONTRACT.ball.roughness <= 0.22 )
  assert.ok( MATERIAL_CONTRACT.ball.clearcoat >= 0.9 )
  assert.equal( MATERIAL_CONTRACT.ball.metalness, 0 )
  assert.ok( MATERIAL_CONTRACT.ball.ior >= 1.5 && MATERIAL_CONTRACT.ball.ior <= 1.56 )
} )

test( 'shared felt contract is cloth-first and color-space safe', () =>
{
  assert.ok( MATERIAL_CONTRACT.felt.roughness >= 0.86 && MATERIAL_CONTRACT.felt.roughness <= 0.96 )
  assert.ok( MATERIAL_CONTRACT.felt.sheen >= 0.25 && MATERIAL_CONTRACT.felt.sheen <= 0.55 )
  assert.equal( MATERIAL_CONTRACT.felt.color, '#0A2C22' )
} )

test( 'quality contract preserves composition while reducing internal cost', () =>
{
  assert.deepEqual( QUALITY_CONTRACT.high.ball, [ 48, 32 ] )
  assert.deepEqual( QUALITY_CONTRACT.standard.ball, [ 40, 24 ] )
  assert.deepEqual( QUALITY_CONTRACT.low.ball, [ 32, 20 ] )
  assert.equal( QUALITY_CONTRACT.low.shadowMapSize, 768 )
  assert.equal( QUALITY_CONTRACT.high.ssao, true )
  assert.equal( QUALITY_CONTRACT.standard.ssao, false )
  assert.equal( QUALITY_CONTRACT.low.ssao, false )
} )

test( 'lighting contract documents the three production roles', () =>
{
  assert.deepEqual( LIGHTING_CONTRACT.balance, { key: 1, ambient: 0.25, rim: 0.4 } )
  assert.equal( LIGHTING_CONTRACT.rim.color, '#79B8B2' )
} )
