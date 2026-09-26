// Bakes the Pool Table look's table plate: the Intro's own Three.js table pieces and materials
// (photorealGeometry.js, photorealMaterials.js, poolSurfaceTextures.js) seen from straight above
// under one rectangular canopy lamp. Runs in the Vite dev server so project modules resolve, on the
// real GPU (Metal).
// Provenance for src/assets/looks/downlight/table-*.webp. To re-bake:
//   npx vite --host 127.0.0.1 --port 5199 --strictPort        (in another terminal)
//   node scripts/bake-pool-table.mjs landscape 2880 table-landscape.png
//   node scripts/bake-pool-table.mjs portrait 1280 table-portrait.png
//   cwebp -q 86 -alpha_q 100 table-landscape.png -o src/assets/looks/downlight/table-landscape.webp
// An optional 4th argument is a JSON object of lighting overrides. BAKE_BASE points at another dev server.
import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

const [ orientation = 'landscape', widthArg = '1440', out = 'plate.png', overridesArg = '{}' ] = process.argv.slice( 2 )
const overrides = JSON.parse( overridesArg )
const BASE = process.env.BAKE_BASE || 'http://127.0.0.1:5199'

const browser = await chromium.launch( {
  headless: false,
  args: [ '--headless=new', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization' ],
} )
const page = await browser.newPage()
page.on( 'pageerror', ( e ) => console.error( 'pageerror:', e.message ) )
// Any JS URL on the dev server gives a same-origin document to import project modules from.
await page.goto( `${BASE}/src/storyTiming.js`, { waitUntil: 'load' } )

const result = await page.evaluate( async ( { orientation, width, overrides } ) =>
{
  // Use the exact three.js copy Vite pre-bundled for the project modules (one copy, shared classes).
  const findDep = async ( file, pattern ) =>
  {
    const src = await ( await fetch( file ) ).text()
    const match = src.match( pattern )
    if ( !match ) throw new Error( `no ${pattern} in ${file}` )
    return match[ 1 ]
  }
  const THREE = await import( await findDep( '/src/drafts/photorealGeometry.js', /from\s*["']([^"']*\/three\.js[^"']*)["']/ ) )
  const { RectAreaLightUniformsLib } = await import( await findDep( '/src/drafts/PhotorealPoolDraft.jsx', /from\s*["']([^"']*RectAreaLightUniformsLib[^"']*)["']/ ) )
  const { RoundedBoxGeometry } = await import( await findDep( '/src/drafts/photorealGeometry.js', /from\s*["']([^"']*RoundedBoxGeometry[^"']*)["']/ ) )
  RectAreaLightUniformsLib.init()
  const G = await import( '/src/drafts/photorealGeometry.js' )
  const M = await import( '/src/drafts/photorealMaterials.js' )

  const deep = ( base, extra ) => ( { ...base, ...extra } )
  const o = {
    exposure: 0.9,
    cloth: '#1d6644',
    railTint: '#b88a62',
    railClearcoat: 0.8,
    railClearcoatRoughness: 0.14,
    railEnv: 0.25,
    railNormal: 0.35,
    railSpecular: 0.35,
    linerColor: '#1f1510',
    hemi: 0.12,
    envCanopy: 2.2,
    cameraHeight: 46,
    margin: 0.2,
    railWidth: 0.9,
    railRound: 0.03,
    cupColor: '#050302',
    lipColor: '#3a2416',
    warmFill: 0.0,
    ...overrides,
    canopy: deep( { color: '#ffefd6', intensity: 3.4, width: 6.2, length: 15.5, height: 5.2 }, overrides.canopy ),
    key: deep( { color: '#fff1dc', intensity: 0.6, tilt: 16, radius: 4, mapSize: 2048 }, overrides.key ),
  }

  // Table plan (x across, z along; the Intro's regulation units). Cushion backs sit at ±4.64 / ±9.6.
  const railIn = { x: 4.64, z: 9.6 }
  const railOut = { x: railIn.x + o.railWidth, z: railIn.z + o.railWidth }
  const halfShort = railOut.x + o.margin
  const halfLong = railOut.z + o.margin
  const landscape = orientation === 'landscape'
  const frameW = landscape ? halfLong * 2 : halfShort * 2
  const frameH = landscape ? halfShort * 2 : halfLong * 2
  const height = Math.round( width * frameH / frameW )

  const canvas = document.createElement( 'canvas' )
  canvas.width = width
  canvas.height = height
  const renderer = new THREE.WebGLRenderer( { canvas, antialias: true, alpha: true, preserveDrawingBuffer: true } )
  renderer.setPixelRatio( 1 )
  renderer.setSize( width, height, false )
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = o.exposure
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setClearColor( 0x000000, 0 )

  // A dark hall whose only bright thing is the canopy overhead: glossy rails reflect the lamp and
  // nothing else, the same on every rail (the Intro's studio softboxes are deliberately lopsided).
  const envScene = new THREE.Scene()
  envScene.background = new THREE.Color( '#040403' )
  const canopyCard = new THREE.Mesh(
    new THREE.PlaneGeometry( o.canopy.width, o.canopy.length ),
    new THREE.MeshBasicMaterial( { color: new THREE.Color( o.canopy.color ).multiplyScalar( o.envCanopy ), side: THREE.DoubleSide, toneMapped: false } ),
  )
  canopyCard.position.set( 0, o.canopy.height, 0 )
  canopyCard.rotation.x = Math.PI / 2
  envScene.add( canopyCard )
  const pmrem = new THREE.PMREMGenerator( renderer )
  const scene = new THREE.Scene()
  scene.environment = pmrem.fromScene( envScene, 0.02 ).texture

  // Materials exactly as the Intro builds them; wait for the three walnut scans to load.
  let loaded = 0
  let woodReady
  const woodLoaded = new Promise( ( resolve ) => { woodReady = resolve } )
  const materials = M.createPhotorealMaterials( new Set(), new Set(), renderer.capabilities.getMaxAnisotropy(), () =>
  {
    loaded += 1
    if ( loaded >= 3 ) woodReady()
  }, 2048 )
  await Promise.race( [ woodLoaded, new Promise( ( r ) => setTimeout( r, 8000 ) ) ] )

  // Tournament cloth reads even under a canopy: keep the fibre normals, drop the dye mottle,
  // which at table scale shows as blotches. The page adds fine nap on top.
  materials.cloth.color.set( o.cloth )
  materials.cushions.color.set( o.cloth )
  materials.cloth.map = null
  materials.cushions.map = null
  materials.cloth.needsUpdate = materials.cushions.needsUpdate = true
  // Lacquered walnut: a warm tint on the scan, a glossy clearcoat that picks up the canopy.
  const rails = materials.rails
  rails.color.set( o.railTint )
  rails.clearcoat = o.railClearcoat
  rails.clearcoatRoughness = o.railClearcoatRoughness
  rails.envMapIntensity = o.railEnv
  rails.normalScale.set( o.railNormal, o.railNormal )
  rails.specularIntensity = o.railSpecular
  // Leather pocket liners, and the cup at the bottom of each drop: almost no light reaches it
  // (area lights cast no shadows, so its darkness is set in the material).
  const leather = materials.pocketLiner
  leather.color.set( o.linerColor )
  const cupMaterial = new THREE.MeshStandardMaterial( { color: o.cupColor, roughness: 1, metalness: 0 } )
  // The rolled leather lip is worn smooth by hands and balls: a little lighter, with a soft sheen.
  const lipMaterial = new THREE.MeshStandardMaterial( { color: o.lipColor, roughness: 0.5, metalness: 0 } )

  const table = new THREE.Group()
  scene.add( table )
  const noop = new Set()

  const felt = new THREE.Mesh( G.createSlateGeometry(), materials.cloth )
  felt.receiveShadow = true
  table.add( felt )

  // Rails: four full walnut rails, the long ones running into the corners, with each pocket cut
  // through them in world space, so the wood wraps round every pocket the way a real rail does.
  const cut = [
    ...G.POCKET_COORDS.filter( ( [ , , n ] ) => n.startsWith( 'corner' ) ).map( ( [ x, z ] ) => [ x, z, 0.62 ] ),
    ...G.POCKET_COORDS.filter( ( [ , , n ] ) => n.startsWith( 'side' ) ).map( ( [ x, z ] ) => [ x, z, 0.6 ] ),
  ]
  const withPocketCuts = ( material ) =>
  {
    const m = material.clone()
    m.onBeforeCompile = ( shader ) =>
    {
      shader.uniforms.uCuts = { value: cut.map( ( [ x, z, r ] ) => new THREE.Vector3( x, z, r ) ) }
      shader.vertexShader = shader.vertexShader
        .replace( '#include <common>', '#include <common>\nvarying vec3 vCutWorld;' )
        .replace( '#include <project_vertex>', '#include <project_vertex>\nvCutWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;' )
      shader.fragmentShader = shader.fragmentShader
        .replace( '#include <common>', '#include <common>\nvarying vec3 vCutWorld;\nuniform vec3 uCuts[ 6 ];' )
        .replace( 'void main() {', 'void main() {\n\tfor ( int i = 0; i < 6; i ++ ) { if ( distance( vCutWorld.xz, uCuts[ i ].xy ) < uCuts[ i ].z ) discard; }' )
    }
    return m
  }
  const railMaterial = withPocketCuts( rails )
  const railH = 0.48
  const addRail = ( sx, sz, x, z ) =>
  {
    const geometry = G.orientRailGrain( new RoundedBoxGeometry( sx, railH, sz, 4, o.railRound ) )
    const mesh = new THREE.Mesh( geometry, railMaterial )
    mesh.position.set( x, railH / 2, z )
    mesh.castShadow = mesh.receiveShadow = true
    table.add( mesh )
  }
  const rw = o.railWidth
  ;[ -1, 1 ].forEach( ( s ) => addRail( rw, railOut.z * 2, s * ( railIn.x + rw / 2 ), 0 ) )
  ;[ -1, 1 ].forEach( ( s ) => addRail( railIn.x * 2, rw, 0, s * ( railIn.z + rw / 2 ) ) )

  // Each pocket is one leather-lined drop from the rail top down into the dark, narrowing a little
  // as it goes, with a cup at the bottom and a rolled leather lip where it meets the rail.
  const dropDepth = 2.9
  cut.forEach( ( [ x, z, r ] ) =>
  {
    const wall = new THREE.Mesh( new THREE.CylinderGeometry( r, r * 0.86, dropDepth, 64, 8, true ), leather )
    wall.position.set( x, railH - dropDepth / 2, z )
    wall.receiveShadow = true
    table.add( wall )
    const cup = new THREE.Mesh( new THREE.CircleGeometry( r * 0.86, 48 ), cupMaterial )
    cup.rotation.x = -Math.PI / 2
    cup.position.set( x, railH - dropDepth, z )
    table.add( cup )
    const lip = new THREE.Mesh( new THREE.TorusGeometry( r, 0.035, 12, 64 ), lipMaterial )
    lip.rotation.x = Math.PI / 2
    lip.position.set( x, railH - 0.01, z )
    lip.castShadow = true
    table.add( lip )
  } )

  // A matte black floor deep under the table: whatever a pocket drop leaves open reads as darkness,
  // never as a see-through gap. It stops at the rails' outer edge, so the plate stays transparent
  // round the table and the page's hall shows there.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry( railOut.x * 2 - 0.02, railOut.z * 2 - 0.02 ),
    new THREE.MeshBasicMaterial( { color: '#000000' } ),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -3.2
  table.add( floor )

  // Cushions exactly where the Intro sets them.
  const headFoot = G.createAngledCushionGeometry( 7.64, 0.36, 0.20, 42, 42 )
  const side = G.createAngledCushionGeometry( 8.06, 0.36, 0.20, 42, 42 )
  // The cushion jaws stop at the leather: the same pocket cuts trim their ends.
  const cushionMaterial = withPocketCuts( materials.cushions )
  const cushion = ( geometry, x, z, rotY ) =>
  {
    const mesh = new THREE.Mesh( geometry, cushionMaterial )
    mesh.rotation.y = rotY
    mesh.position.set( x, 0.22, z )
    mesh.castShadow = mesh.receiveShadow = true
    table.add( mesh )
  }
  cushion( headFoot, 0, -9.24, 0 )
  cushion( headFoot, 0, 9.24, Math.PI )
  cushion( side, 4.44, 4.65, -Math.PI / 2 )
  cushion( side, 4.44, -4.65, -Math.PI / 2 )
  cushion( side, -4.44, 4.65, Math.PI / 2 )
  cushion( side, -4.44, -4.65, Math.PI / 2 )

  // Diamond sights: pearl inlays in a thin ebony bezel, three between each pair of pockets,
  // dividing the playing surface into quarters (the Intro's own sights are round pins).
  const diamond = ( halfLength, halfWidth ) =>
  {
    const shape = new THREE.Shape()
    shape.moveTo( 0, halfLength )
    shape.lineTo( halfWidth, 0 )
    shape.lineTo( 0, -halfLength )
    shape.lineTo( -halfWidth, 0 )
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry( shape, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.006, bevelSegments: 3 } )
    geometry.rotateX( -Math.PI / 2 )
    return geometry
  }
  const pearl = new THREE.MeshPhysicalMaterial( {
    color: '#efe6d4',
    roughness: 0.32,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    iridescence: 0.8,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [ 200, 560 ],
    sheen: 0.5,
    sheenColor: new THREE.Color( '#fff6e8' ),
    envMapIntensity: 1.2,
  } )
  const bezel = new THREE.MeshStandardMaterial( { color: '#140d08', roughness: 0.5, metalness: 0 } )
  const pearlGeom = diamond( 0.085, 0.036 )
  const bezelGeom = diamond( 0.103, 0.05 )
  const sight = ( x, z, alongZ ) =>
  {
    ;[ [ bezelGeom, bezel, railH - 0.0005 ], [ pearlGeom, pearl, railH + 0.0005 ] ].forEach( ( [ geometry, material, y ] ) =>
    {
      const mesh = new THREE.Mesh( geometry, material )
      mesh.position.set( x, y, z )
      if ( !alongZ ) mesh.rotation.y = Math.PI / 2
      mesh.receiveShadow = true
      table.add( mesh )
    } )
  }
  const railMidX = railIn.x + rw / 2
  const railMidZ = railIn.z + rw / 2
  ;[ -railMidX, railMidX ].forEach( ( x ) => [ -6.9375, -4.625, -2.3125, 2.3125, 4.625, 6.9375 ].forEach( ( z ) => sight( x, z, true ) ) )
  ;[ -railMidZ, railMidZ ].forEach( ( z ) => [ -2.225, 0, 2.225 ].forEach( ( x ) => sight( x, z, false ) ) )

  // The lamp: one rectangular tournament canopy over the bed, long axis down the table.
  const canopy = new THREE.RectAreaLight( o.canopy.color, o.canopy.intensity, o.canopy.width, o.canopy.length )
  canopy.position.set( 0, o.canopy.height, 0 )
  canopy.rotation.x = -Math.PI / 2
  scene.add( canopy )
  // Area lights cast no shadows in three.js. Four soft shadow lights, each tilted a little off
  // vertical from a different side, add up to the canopy's shadow: soft, even on every side of a
  // cushion or lip. Tilted, their mirror reflections miss the camera overhead, so they light the
  // wood without laying a flat glare over every rail (a light straight above the camera does).
  const tilt = THREE.MathUtils.degToRad( o.key.tilt )
  ;[ [ 1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, -1 ] ].forEach( ( [ dx, dz ] ) =>
  {
    const key = new THREE.DirectionalLight( o.key.color, o.key.intensity / 4 )
    key.position.set( dx * Math.sin( tilt ) * 20, Math.cos( tilt ) * 20, dz * Math.sin( tilt ) * 20 )
    key.target.position.set( 0, 0, 0 )
    key.castShadow = true
    key.shadow.mapSize.set( o.key.mapSize, o.key.mapSize )
    Object.assign( key.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 40 } )
    key.shadow.radius = o.key.radius
    key.shadow.bias = -0.0002
    key.shadow.normalBias = 0.02
    scene.add( key, key.target )
  } )
  scene.add( new THREE.HemisphereLight( M.TABLE_PALETTE.feltBounce, '#020403', o.hemi ) )
  // Spill from the rest of the hall: a faint warm fill low round the room lifts the rails' grain.
  if ( o.warmFill > 0 )
  {
    ;[ [ 1, 1 ], [ -1, 1 ], [ 1, -1 ], [ -1, -1 ] ].forEach( ( [ sx, sz ] ) =>
    {
      const fill = new THREE.DirectionalLight( '#ffd9ae', o.warmFill )
      fill.position.set( sx * 9, 7, sz * 14 )
      fill.target.position.set( 0, 0, 0 )
      scene.add( fill, fill.target )
    } )
  }

  // Camera high above the centre, narrow lens: near-orthographic, but the pockets' far walls
  // still show a little depth, as in a ceiling shot.
  const cam = new THREE.PerspectiveCamera( 10, width / height, 1, 200 )
  const dist = o.cameraHeight - railH
  cam.fov = THREE.MathUtils.radToDeg( 2 * Math.atan( ( frameH / 2 ) / dist ) )
  cam.position.set( 0, o.cameraHeight, 0 )
  cam.up.set( landscape ? 1 : 0, 0, landscape ? 0 : -1 )
  cam.lookAt( 0, 0, 0 )
  cam.updateProjectionMatrix()

  renderer.render( scene, cam )

  // Measure the lit cloth at the centre and near a cushion: ivory type needs it dark enough.
  const probe = document.createElement( 'canvas' )
  probe.width = width
  probe.height = height
  const ctx = probe.getContext( '2d' )
  ctx.drawImage( canvas, 0, 0 )
  const lum = ( fx, fy ) =>
  {
    const [ r, g, b ] = ctx.getImageData( Math.round( fx * width ), Math.round( fy * height ), 1, 1 ).data
    const lin = ( c ) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ( ( c + 0.055 ) / 1.055 ) ** 2.4 }
    return { rgb: `rgb(${r} ${g} ${b})`, L: +( 0.2126 * lin( r ) + 0.7152 * lin( g ) + 0.0722 * lin( b ) ).toFixed( 3 ) }
  }
  // Plate geometry for the page: where the rails end and the cushion noses sit, as shares of the plate.
  const share = {
    railInner: landscape ? ( halfLong - railIn.z ) / frameW : ( halfShort - railIn.x ) / frameW,
    noseX: landscape ? ( halfLong - 9.24 ) / frameW : ( halfShort - 4.44 ) / frameW,
    noseY: landscape ? ( halfShort - 4.44 ) / frameH : ( halfLong - 9.24 ) / frameH,
    railOuterX: o.margin / ( landscape ? frameW : frameW ),
  }
  // Dither: ±1.5 of seeded noise per channel breaks the 8-bit banding a smooth dark gradient shows
  // (and WebP would deepen). Seeded, so a re-bake gives the same pixels.
  let seed = 0x8ba11
  const random = () =>
  {
    seed = ( seed + 0x6d2b79f5 ) | 0
    let t = Math.imul( seed ^ ( seed >>> 15 ), 1 | seed )
    t = ( t + Math.imul( t ^ ( t >>> 7 ), 61 | t ) ) ^ t
    return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296
  }
  const pixels = ctx.getImageData( 0, 0, width, height )
  const data = pixels.data
  for ( let i = 0; i < data.length; i += 4 )
  {
    if ( data[ i + 3 ] === 0 ) continue
    const n = ( random() - 0.5 ) * 3
    data[ i ] = Math.max( 0, Math.min( 255, data[ i ] + n ) )
    data[ i + 1 ] = Math.max( 0, Math.min( 255, data[ i + 1 ] + n ) )
    data[ i + 2 ] = Math.max( 0, Math.min( 255, data[ i + 2 ] + n ) )
  }
  ctx.putImageData( pixels, 0, 0 )

  // Optional close-up for inspection: crop = { x, y, w, h } as shares of the plate.
  let png = probe.toDataURL( 'image/png' )
  if ( o.crop )
  {
    const c = document.createElement( 'canvas' )
    c.width = Math.round( o.crop.w * width )
    c.height = Math.round( o.crop.h * height )
    c.getContext( '2d' ).drawImage( probe, Math.round( o.crop.x * width ), Math.round( o.crop.y * height ), c.width, c.height, 0, 0, c.width, c.height )
    png = c.toDataURL( 'image/png' )
  }
  return {
    png,
    width,
    height,
    centre: lum( 0.5, 0.5 ),
    third: lum( 0.3, 0.35 ),
    nearCushion: lum( 0.5, landscape ? ( halfShort - 4.3 ) / frameH : 0.5 ),
    share,
  }
}, { orientation, width: Number( widthArg ), overrides } )

writeFileSync( out, Buffer.from( result.png.split( ',' )[ 1 ], 'base64' ) )
console.log( JSON.stringify( { out, width: result.width, height: result.height, centre: result.centre, third: result.third, nearCushion: result.nearCushion, share: result.share } ) )
await browser.close()
