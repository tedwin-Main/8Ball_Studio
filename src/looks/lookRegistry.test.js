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
  getThemeColor,
} from './lookRegistry.js'

test( 'lookRegistry exposes three looks in dropdown order, with Main as the default', () =>
{
  assert.deepEqual( LOOK_IDS, [ 'acid', 'cyc', 'downlight' ] )
  assert.equal( DEFAULT_LOOK_ID, 'acid' )
  assert.equal( LOOK_CONFIGS.acid.label, 'Main' )
} )

test( 'normalizeLookId accepts known ids and falls back to the default', () =>
{
  LOOK_IDS.forEach( ( id ) => assert.equal( normalizeLookId( id ), id ) )
  assert.equal( normalizeLookId( null ), 'acid' )
  assert.equal( normalizeLookId( 'neon' ), 'acid' )
  // Retired looks resolve to the default instead of rendering an unstyled page.
  assert.equal( normalizeLookId( 'marker' ), 'acid' )
  assert.equal( getLookConfig( 'nope' ).id, 'acid' )
  // Inherited object keys are not looks.
  assert.equal( normalizeLookId( 'toString' ), 'acid' )
} )

test( 'every look names its chrome colour per Page', () =>
{
  LOOK_IDS.forEach( ( id ) =>
  {
    [ 'intro', 'studio', 'projects', 'contact' ].forEach( ( pageId ) =>
    {
      assert.match( getThemeColor( id, pageId ), /^#[0-9a-f]{6}$/, `${id} ${pageId}` )
    } )
  } )
  // Main runs ink → paper → acid.
  assert.deepEqual(
    [ 'studio', 'projects', 'contact' ].map( ( pageId ) => getThemeColor( 'acid', pageId ) ),
    [ '#070908', '#f2f1e9', '#b7d95b' ],
  )
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
    // The section handoffs are shared by every look (src/motion/flowMotion.js): no look carries its own.
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
    assert.match( to.clipPath, /^(circle\(150%|inset\(0% 0% 0% 0%\))/ )
  } )
} )

test( 'every look names the elements that read the pointer key light', () =>
{
  // App.jsx writes --lx / --ly only on these, never on the page root (whole-page re-style per frame).
  LOOK_IDS.forEach( ( id ) =>
  {
    assert.equal( typeof LOOK_CONFIGS[ id ].keyLight, 'string', id )
    assert.ok( LOOK_CONFIGS[ id ].keyLight.length > 0, id )
  } )
} )
