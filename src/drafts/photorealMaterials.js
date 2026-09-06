// Production PBR materials for Draft 4 Photoreal Break.
import * as THREE from "three"
import { TABLE_PALETTE } from "./tablePalette.js"
import { createFeltTextures, createWoodTextures, createPocketLeatherTextures, createBallSurfaceTextures } from './poolSurfaceTextures.js'

const createContactShadowTexture = () =>
{
  const canvas = document.createElement( "canvas" )
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext( "2d" )
  const gradient = context.createRadialGradient( 64, 64, 0, 64, 64, 64 )
  gradient.addColorStop( 0, "rgba(0, 0, 0, 0.94)" )
  gradient.addColorStop( 0.25, "rgba(0, 0, 0, 0.78)" )
  gradient.addColorStop( 0.58, "rgba(0, 0, 0, 0.22)" )
  gradient.addColorStop( 1, "rgba(0, 0, 0, 0)" )
  context.fillStyle = gradient
  context.fillRect( 0, 0, 128, 128 )
  return new THREE.CanvasTexture( canvas )
}

export const createNumberedBallTexture = ( number, color, anisotropy = 16 ) =>
{
  const canvas = document.createElement( "canvas" )
  canvas.width = 1024
  canvas.height = 512
  const context = canvas.getContext( "2d" )
  const isStripe = number > 8

  context.fillStyle = isStripe ? "#faf6ee" : color
  context.fillRect( 0, 0, canvas.width, canvas.height )

  if ( isStripe )
  {
    context.fillStyle = color
    context.fillRect( 0, 118, canvas.width, 276 )
  }

  ;[ canvas.width * 0.25, canvas.width * 0.75 ].forEach( ( centerX ) =>
  {
    context.fillStyle = "#faf6ee"
    context.beginPath()
    context.arc( centerX, 256, 76, 0, Math.PI * 2 )
    context.fill()

    context.fillStyle = "#111214"
    context.font = "bold 84px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.fillText( String( number ), centerX, 260 )
    if ( number === 6 || number === 9 )
    {
      context.fillRect( centerX - 24, 304, 48, 6 )
    }
  } )

  const texture = new THREE.CanvasTexture( canvas )
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy
  return texture
}

export const createPoolFeltMaterial = ( felt ) => new THREE.MeshPhysicalMaterial( {
    ...felt,
    normalScale: new THREE.Vector2( 0.18, 0.18 ),
    color: TABLE_PALETTE.felt,
    roughness: 1.0,
    metalness: 0,
    sheen: 0.44,
    sheenRoughness: 0.82,
    sheenColor: new THREE.Color( TABLE_PALETTE.feltSheen ),
    envMapIntensity: 0.28,
    clearcoat: 0,
  } )

export const createPhotorealMaterials = ( disposables, textures, anisotropy, requestRender ) =>
{
  const felt = createFeltTextures( anisotropy, 72, 144 )
  const wood = createWoodTextures( anisotropy, requestRender )
  const leather = createPocketLeatherTextures( anisotropy )
  const resin = createBallSurfaceTextures( anisotropy )
  ;[ felt, wood, leather, resin ].forEach( ( maps ) => Object.values( maps ).forEach( ( texture ) => textures.add( texture ) ) )

  // Tournament worsted cloth with directional sheen
  const cloth = createPoolFeltMaterial( felt )

  // Hardwood rails with lacquer clearcoat
  const rails = new THREE.MeshPhysicalMaterial( {
    ...wood,
    normalScale: new THREE.Vector2( 0.16, 0.16 ),
    color: TABLE_PALETTE.rail,
    roughness: 0.65,
    metalness: 0,
    clearcoat: 0.42,
    clearcoatRoughness: 0.24,
    envMapIntensity: 0.75,
  } )

  // Cushions matching cloth profile
  const cushions = new THREE.MeshPhysicalMaterial( {
    ...felt,
    normalScale: new THREE.Vector2( 0.18, 0.18 ),
    color: TABLE_PALETTE.felt,
    roughness: 1.0,
    metalness: 0,
    sheen: 0.24,
    sheenRoughness: 0.86,
    sheenColor: new THREE.Color( TABLE_PALETTE.feltSheen ),
  } )

  // Leather pocket drop liner
  const pocketLiner = new THREE.MeshStandardMaterial( {
    ...leather,
    normalScale: new THREE.Vector2( 0.3, 0.3 ),
    color: TABLE_PALETTE.pocketInterior,
    roughness: 0.88,
    metalness: 0.05,
    side: THREE.DoubleSide,
  } )

  // Dark gunmetal/bronze corner castings and matching rail hardware
  const metalCastings = new THREE.MeshStandardMaterial( {
    color: "#383736",
    metalness: 0.86,
    roughness: 0.26,
    envMapIntensity: 0.75,
  } )

  // Table apron skirt
  const apron = new THREE.MeshStandardMaterial( {
    ...wood,
    normalScale: new THREE.Vector2( 0.12, 0.12 ),
    color: TABLE_PALETTE.apron,
    roughness: 0.46,
    metalness: 0.08,
  } )

  // Diamond sights
  const sights = new THREE.MeshStandardMaterial( {
    color: "#f4edd8",
    metalness: 0.82,
    roughness: 0.18,
  } )

  // Cue stick materials
  const cueWood = new THREE.MeshPhysicalMaterial( {
    ...wood,
    color: "#ecd4b6",
    roughness: 0.32,
    clearcoat: 0.5,
    clearcoatRoughness: 0.18,
  } )

  const cueWrap = new THREE.MeshStandardMaterial( {
    ...leather,
    color: "#252525",
    roughness: 0.82,
  } )

  const cueFerrule = new THREE.MeshStandardMaterial( {
    color: "#f7f7f7",
    roughness: 0.22,
  } )

  const cueTip = new THREE.MeshStandardMaterial( {
    color: "#2b5c7c",
    roughness: 0.92,
  } )

  // Contact shadow material
  const shadowTexture = createContactShadowTexture()
  textures.add( shadowTexture )
  const contactShadow = new THREE.MeshBasicMaterial( {
    map: shadowTexture,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    toneMapped: false,
  } )

  const materials = {
    cloth,
    rails,
    cushions,
    pocketLiner,
    metalCastings,
    apron,
    sights,
    cueWood,
    cueWrap,
    cueFerrule,
    cueTip,
    contactShadow,
  }

  Object.values( materials ).forEach( ( mat ) => disposables.add( mat ) )
  return { ...materials, resin }
}

export const createPhenolicBallMaterial = ( color, texture = null, disposables = null, surfaceTextures = null ) =>
{
  const mat = new THREE.MeshPhysicalMaterial( {
    color: texture ? "#ffffff" : color,
    map: texture,
    roughness: 0.19,
    roughnessMap: surfaceTextures?.roughnessMap,
    clearcoatNormalMap: surfaceTextures?.normalMap,
    clearcoatNormalScale: new THREE.Vector2( 0.04, 0.04 ),
    metalness: 0,
    clearcoat: 0.72,
    clearcoatRoughness: 0.16,
    ior: 1.54,
    reflectivity: 0.52,
    envMapIntensity: 0.65,
  } )
  if ( disposables ) disposables.add( mat )
  return mat
}
