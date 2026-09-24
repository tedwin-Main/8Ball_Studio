import test from 'node:test'
import assert from 'node:assert/strict'
import {
  LOOK_CONFIGS,
  LOOK_IDS,
  DEFAULT_LOOK_ID,
  REVEALS,
  normalizeLookId,
  getLookConfig,
  getRevealVars,
} from './lookRegistry.js'

test( 'lookRegistry exposes every look, with Downlight as the default', () =>
{
  assert.deepEqual( LOOK_IDS, [ 'cyc', 'downlight', 'baize', 'crucible', 'develop', 'chit', 'film', 'noir', 'flap', 'poster', 'marker' ] )
  assert.equal( DEFAULT_LOOK_ID, 'downlight' )
} )

test( 'normalizeLookId accepts known ids and falls back to the default', () =>
{
  LOOK_IDS.forEach( ( id ) => assert.equal( normalizeLookId( id ), id ) )
  assert.equal( normalizeLookId( null ), 'downlight' )
  assert.equal( normalizeLookId( 'neon' ), 'downlight' )
  assert.equal( getLookConfig( 'nope' ).id, 'downlight' )
  // Inherited object keys are not looks.
  assert.equal( normalizeLookId( 'toString' ), 'downlight' )
} )

test( 'every look defines the Studio cue: a known reveal, its origin, a letter entrance, and a label entrance', () =>
{
  Object.values( LOOK_CONFIGS ).forEach( ( { id, motion } ) =>
  {
    assert.ok( REVEALS[ motion.reveal ], `${id} reveal` )
    assert.ok( typeof motion.origin === 'string', `${id} origin` )
    assert.ok( motion.entrance && typeof motion.entrance === 'object', `${id} entrance` )
    assert.ok( motion.label?.from, `${id} label` )
    assert.ok( typeof motion.letterEase === 'string', `${id} letterEase` )
    // Projects and Contact scroll as normal sections: no look may carry per-Page transitions.
    assert.equal( motion.origins, undefined, `${id} has no per-Page origins` )
    assert.equal( motion.entrances, undefined, `${id} has no per-Page entrances` )
  } )
} )

test( 'every reveal sets its own scrub ease so no notch floods the whole Page at once', () =>
{
  LOOK_IDS.forEach( ( id ) =>
  {
    const { ease } = getRevealVars( id ).to
    assert.ok( typeof ease === 'function' || typeof ease === 'string', `${id} reveal ease` )
    assert.notEqual( ease, 'cue', `${id} reveal must not use the front-loaded cue ease` )
  } )
} )

test( 'reveal clip-path numbers are canonical so GSAP can tween every frame', () =>
{
  // GSAP's CSS tween takes a number's unit to be whatever follows String(parseFloat(token)).
  // A token like "-42.00%" would tween with unit ".00%", and the browser rejects every frame.
  LOOK_IDS.forEach( ( id ) =>
  {
    const { from, to } = getRevealVars( id )
    ;[ from.clipPath, to.clipPath ].filter( ( value ) => value && value !== 'none' ).forEach( ( value ) =>
    {
      value.match( /-?[\d.]+%?/g ).forEach( ( token ) =>
      {
        const unit = token.endsWith( '%' ) ? '%' : ''
        assert.equal( `${parseFloat( token )}${unit}`, token, `${id}: ${token} in ${value}` )
      } )
    } )
  } )
} )

test( 'reveal vars end fully open so Studio is completely lit at rest', () =>
{
  LOOK_IDS.forEach( ( id ) =>
  {
    const { from, to, usesOpacity } = getRevealVars( id )
    if ( usesOpacity )
    {
      assert.equal( from.autoAlpha, 0 )
      assert.equal( to.autoAlpha, 1 )
      return
    }
    assert.match( from.clipPath, /^(circle|ellipse|inset|polygon)\(/ )
    assert.match( to.clipPath, /^(circle\(150%|ellipse\(170% 150%|inset\(0% 0% 0% 0%\)|polygon\()/ )
    if ( to.clipPath.startsWith( 'polygon' ) )
    {
      // The cone's sides must clear both top corners at y = 0 so the rest state covers the Page.
      const [ [ tlx, tly ], [ trx, try_ ], [ brx, bry ], [ blx, bly ] ] = to.clipPath.slice( 8, -1 ).split( ',' ).map( ( pair ) => pair.trim().split( ' ' ).map( parseFloat ) )
      const leftAtTop = tlx + ( blx - tlx ) * ( ( 0 - tly ) / ( bly - tly ) )
      const rightAtTop = trx + ( brx - trx ) * ( ( 0 - try_ ) / ( bry - try_ ) )
      assert.ok( leftAtTop <= 0, `${id} beam covers the top-left corner` )
      assert.ok( rightAtTop >= 100, `${id} beam covers the top-right corner` )
    }
  } )
} )
