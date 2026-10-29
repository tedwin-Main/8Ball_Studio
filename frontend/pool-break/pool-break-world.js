// Builds the Intro's three.js world: renderer, balls, contact shadows, lights, hover response, resize, dispose.
import * as THREE from 'three'
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js'
import { resolvePhotoHoverResponse } from './camera-framing'
import {
  createContactShadowTexture,
  createLogoTexture,
  createNumberedBallTexture,
} from './pool-surface-textures.js'
import { BALL_COLORS, RACK_BALL_NUMBERS } from './rack-layout.js'
import { freezeDeep } from '../lib/freeze-deep.js'

// Phones redraw the full-screen scene on every scroll frame with a mobile GPU, so they render at 1x
// (MSAA stays on: without it the ball edges stair-step), with lighter spheres and no clearcoat pass.
const IS_TOUCH = typeof window !== 'undefined' && window.matchMedia( '(hover: none) and (pointer: coarse)' ).matches
// Desktop caps at 1.5 so Retina screens do not pay excess fill rate.
const PIXEL_RATIO_CAP = IS_TOUCH ? 1 : 1.5

// Each plate stores its table, light, rail, and projected pocket measurements together.
const PLATE_CALIBRATIONS = freezeDeep( {
  landscape: {
    referenceAspect: 1.6,
    tablePlane: {
      position: [ 0, 0, 0 ],
      rotation: [ 0, 0, 0 ],
      scale: 1,
    },
    farRailAnchors: {
      left: [ 0.08433, 0.35152 ],
      right: [ 0.91567, 0.35152 ],
    },
    projectedAnchors: {
      rackApex: [ 0.5, 0.38488 ],
      strikerContact: [ 0.49807, 0.38747 ],
    },
    lightPosition: [ -0.42, 1.42, -0.46 ],
    pocketProjection: [
      [ 0.08104, 0.35087 ],
      [ 0.91896, 0.35087 ],
      [ -0.12216, 0.55379 ],
      [ 1.12216, 0.55379 ],
      [ -0.69365, 1.13194 ],
      [ 1.69365, 1.13194 ],
    ],
  },
  portrait: {
    referenceAspect: 390 / 844,
    tablePlane: {
      position: [ 0, 0, 0 ],
      rotation: [ 0, 0, 0 ],
      scale: 1,
    },
    // Rail and pockets as placed by the portrait .pool-pov-photo rule in intro-break.css (the plate zoomed
    // 1.28x from its top edge, which brings the far cushion down onto the rack's back row).
    farRailAnchors: {
      left: [ -0.16149, 0.39523 ],
      right: [ 1.16149, 0.39523 ],
    },
    projectedAnchors: {
      rackApex: [ 0.5, 0.38488 ],
      strikerContact: [ 0.49331, 0.38747 ],
    },
    lightPosition: [ 0, 1.82, -0.52 ],
    pocketProjection: [
      [ -0.16673, 0.39418 ],
      [ 1.16673, 0.39418 ],
      [ -0.48481, 0.71959 ],
      [ 1.48481, 0.71959 ],
      [ -1.36103, 1.62792 ],
      [ 2.36103, 1.62792 ],
    ],
  },
} )

const createWarmEnvironment = ( renderer ) =>
{
  const environmentScene = new THREE.Scene()
  // A dim felt-colored ambient floor stops glossy black surfaces clipping to absolute black.
  environmentScene.background = new THREE.Color( '#151b16' )
  const resources = []

  const addCard = ( geometry, color, intensity, position, target = [ 0, 0, 0 ] ) =>
  {
    const material = new THREE.MeshBasicMaterial( {
      color,
      side: THREE.DoubleSide,
      toneMapped: false,
    } )
    material.color.multiplyScalar( intensity )
    const card = new THREE.Mesh( geometry, material )
    card.position.set( ...position )
    card.lookAt( ...target )
    environmentScene.add( card )
    resources.push( geometry, material )
  }

  // Reflection cards reproduce the photographed room and keep the black foreground ball readable.
  addCard( new THREE.CircleGeometry( 0.72, 48 ), '#ffd99a', 2.2, [ -0.25, 2.1, -0.55 ] )
  addCard( new THREE.PlaneGeometry( 1.8, 0.34 ), '#b77742', 0.62, [ 1.7, 0.72, 0.25 ] )
  addCard( new THREE.PlaneGeometry( 1.2, 0.26 ), '#426352', 0.32, [ -1.4, 0.38, -0.8 ] )
  addCard( new THREE.PlaneGeometry( 1.6, 0.72 ), '#8ca899', 0.38, [ 0, 0.58, 1.65 ], [ 0, 0.04, 0.3 ] )

  const generator = new THREE.PMREMGenerator( renderer )
  generator.compileCubemapShader()
  const target = generator.fromScene( environmentScene, 0.04 )
  resources.forEach( ( resource ) => resource.dispose() )
  generator.dispose()
  return target
}

const createBallMaterial = ( color, texture ) => IS_TOUCH
  ? new THREE.MeshStandardMaterial( {
    color: texture ? '#ffffff' : color,
    map: texture,
    roughness: 0.06,
    metalness: 0,
    envMapIntensity: 0.9,
  } )
  : new THREE.MeshPhysicalMaterial( {
    color: texture ? '#ffffff' : color,
    map: texture,
    roughness: 0.075,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.035,
    ior: 1.54,
    reflectivity: 0.82,
    envMapIntensity: 0.78,
  } )


const createRenderer = ( canvas ) =>
{
  const renderer = new THREE.WebGLRenderer( {
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  } )
  renderer.setClearColor( 0x000000, 0 )
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.95
  // The photo carries broad table shading; explicit contact planes add ball grounding without a shadow-map pass.
  renderer.shadowMap.enabled = false
  return renderer
}

// One shared texture, material and plane for every ball's contact shadow; add() places the next one.
const createContactShadows = ( tableRoot, radius, maximumAnisotropy, disposableTextures ) =>
{
  const texture = createContactShadowTexture( maximumAnisotropy )
  disposableTextures.add( texture )
  const material = new THREE.MeshBasicMaterial( {
    map: texture,
    color: '#020403',
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  } )
  const geometry = new THREE.PlaneGeometry( radius * 2.8, radius * 2.8 )
  geometry.rotateX( -Math.PI / 2 )
  const group = new THREE.Group()
  tableRoot.add( group )
  const meshes = []
  const add = () =>
  {
    const shadow = new THREE.Mesh( geometry, material )
    shadow.position.y = 0.001
    shadow.renderOrder = 1
    group.add( shadow )
    meshes.push( shadow )
  }
  return { meshes, add }
}

const createDecalMaterial = ( logoTexture ) => new THREE.MeshPhysicalMaterial( {
  map: logoTexture,
  color: '#ffffff',
  // The glyph also glows a little in ivory, so the brand "8" reads ivory on the dim table and not
  // khaki-grey after tone mapping. The hover response changes emissiveIntensity.
  emissive: '#f3eee2',
  emissiveMap: logoTexture,
  emissiveIntensity: 0.35,
  // The texture carries only the white glyph; the striker's resin shows through everywhere else.
  transparent: true,
  roughness: 0.12,
  clearcoat: IS_TOUCH ? 0 : 0.9,
  clearcoatRoughness: 0.05,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
} )

// The 8-ball: black resin sphere with the brand logo decaled on its front and back.
const createStriker = ( ballGeometry, radius, logoTexture ) =>
{
  const material = createBallMaterial( '#070807', null )
  const mesh = new THREE.Mesh( ballGeometry, material )
  mesh.updateMatrixWorld()

  const decalMaterial = createDecalMaterial( logoTexture )
  const group = new THREE.Group()

  ;[ [ radius, 0 ], [ -radius, Math.PI ] ].forEach( ( [ decalZ, yaw ] ) =>
  {
    const decal = new THREE.Mesh(
      new DecalGeometry(
        mesh,
        new THREE.Vector3( 0, 0, decalZ ),
        new THREE.Euler( 0, yaw, 0 ),
        new THREE.Vector3( radius * 1.58, radius * 1.58, radius * 0.42 ),
      ),
      decalMaterial,
    )
    decal.renderOrder = 2
    group.add( decal )
  } )
  group.add( mesh )
  return { group, material, decalMaterial }
}

const createRackBall = ( number, ballGeometry, maximumAnisotropy, requestRender, disposableTextures ) =>
{
  const texture = createNumberedBallTexture(
    number,
    BALL_COLORS[ number - 1 ],
    maximumAnisotropy,
    requestRender,
  )
  disposableTextures.add( texture )
  const material = createBallMaterial( BALL_COLORS[ number - 1 ], texture )
  return new THREE.Mesh( ballGeometry, material )
}

// The pendant supplies warm specular light while the contact planes anchor balls to the photo plate.
const addLights = ( scene, rackApexZ ) =>
{
  const pendantSpot = new THREE.SpotLight( '#ffe5b5', 18, 7, Math.PI / 3.1, 0.82, 1.35 )
  pendantSpot.target.position.set( 0, 0, rackApexZ )
  scene.add( pendantSpot, pendantSpot.target )

  const feltBounce = new THREE.HemisphereLight( '#1b5b43', '#020302', 0.42 )
  scene.add( feltBounce )
  const warmFill = new THREE.DirectionalLight( '#d9a36e', 0.34 )
  warmFill.position.set( 1.8, 1.05, 0.55 )
  scene.add( warmFill )
  return pendantSpot
}

// Moves the key light and brightens the 8-ball's reflections with the camera hover cue.
const createHoverResponder = ( pendantSpot, strikerMaterial, decalMaterial ) =>
{
  const baseLightPosition = new THREE.Vector3()
  let hoverResponse = resolvePhotoHoverResponse()
  const setHoverResponse = ( nextResponse = resolvePhotoHoverResponse() ) =>
  {
    hoverResponse = nextResponse
    pendantSpot.position.set(
      baseLightPosition.x + nextResponse.x * 0.045,
      baseLightPosition.y + nextResponse.y * 0.035,
      baseLightPosition.z - nextResponse.x * 0.02 + nextResponse.y * 0.02,
    )
    strikerMaterial.envMapIntensity = 0.78 + nextResponse.strength * 0.12
    decalMaterial.envMapIntensity = 1 + nextResponse.strength * 0.1
    decalMaterial.emissiveIntensity = 0.35 + nextResponse.strength * 0.04
  }
  const setBaseLightPosition = ( position ) =>
  {
    baseLightPosition.set( ...position )
    setHoverResponse( hoverResponse )
  }
  return { setHoverResponse, setBaseLightPosition }
}

const resizeToViewport = ( { canvas, camera, renderer, tableRoot, hover, shadowCount } ) =>
{
  const width = Math.max( 1, canvas.clientWidth || window.innerWidth )
  const height = Math.max( 1, canvas.clientHeight || window.innerHeight )
  const mode = height > width ? 'portrait' : 'landscape'
  const calibration = PLATE_CALIBRATIONS[ mode ]
  const plane = calibration.tablePlane

  camera.aspect = width / height
  camera.updateProjectionMatrix()

  tableRoot.position.set( ...plane.position )
  tableRoot.rotation.set( ...plane.rotation )
  tableRoot.scale.setScalar( plane.scale )
  hover.setBaseLightPosition( calibration.lightPosition )

  // Keep CSS size and camera framing unchanged while limiting internal render pixels.
  const pixelRatio = Math.min( window.devicePixelRatio || 1, PIXEL_RATIO_CAP )
  renderer.setPixelRatio( pixelRatio )
  renderer.setSize( width, height, false )

  canvas.dataset.plate = mode
  canvas.dataset.farRail = `${calibration.farRailAnchors.left.join( ',' )};${calibration.farRailAnchors.right.join( ',' )}`
  canvas.dataset.pockets = calibration.pocketProjection.length
  canvas.dataset.contactShadows = String( shadowCount )
}

const disposeWorld = ( scene, disposableTextures, environmentTarget, renderer ) =>
{
  const geometries = new Set()
  const disposableMaterials = new Set()
  scene.traverse( ( object ) =>
  {
    if ( object.geometry ) geometries.add( object.geometry )
    if ( object.material )
    {
      const objectMaterials = Array.isArray( object.material ) ? object.material : [ object.material ]
      objectMaterials.forEach( ( material ) => disposableMaterials.add( material ) )
    }
  } )
  geometries.forEach( ( geometry ) => geometry.dispose() )
  disposableMaterials.forEach( ( material ) => material.dispose() )
  disposableTextures.forEach( ( texture ) => texture.dispose() )
  environmentTarget.dispose()
  renderer.dispose()
}

export const buildWorld = ( canvas, simulation, requestRender ) =>
{
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera( 36, 1, 0.01, 40 )
  const renderer = createRenderer( canvas )

  const maximumAnisotropy = Math.min( IS_TOUCH ? 2 : 8, renderer.capabilities.getMaxAnisotropy() )
  const disposableTextures = new Set()
  const environmentTarget = createWarmEnvironment( renderer )
  scene.environment = environmentTarget.texture
  scene.environmentIntensity = 0.68

  const tableRoot = new THREE.Group()
  scene.add( tableRoot )

  const radius = simulation.config.ball.radius
  const ballGeometry = new THREE.SphereGeometry( radius, IS_TOUCH ? 32 : 48, IS_TOUCH ? 20 : 32 )
  const shadows = createContactShadows( tableRoot, radius, maximumAnisotropy, disposableTextures )

  const logoTexture = createLogoTexture( maximumAnisotropy, requestRender )
  disposableTextures.add( logoTexture )
  const striker = createStriker( ballGeometry, radius, logoTexture )
  const ballMeshes = []
  const addBall = ( object ) =>
  {
    tableRoot.add( object )
    ballMeshes.push( object )
    shadows.add()
  }
  addBall( striker.group )
  RACK_BALL_NUMBERS.forEach( ( number ) =>
  {
    addBall( createRackBall( number, ballGeometry, maximumAnisotropy, requestRender, disposableTextures ) )
  } )

  const pendantSpot = addLights( scene, simulation.config.rack.apexZ )
  const hover = createHoverResponder( pendantSpot, striker.material, striker.decalMaterial )

  return {
    camera,
    radius,
    ballMeshes,
    ballShadows: shadows.meshes,
    resize: () => resizeToViewport( { canvas, camera, renderer, tableRoot, hover, shadowCount: shadows.meshes.length } ),
    render: () => renderer.render( scene, camera ),
    setHoverResponse: hover.setHoverResponse,
    dispose: () => disposeWorld( scene, disposableTextures, environmentTarget, renderer ),
  }
}
