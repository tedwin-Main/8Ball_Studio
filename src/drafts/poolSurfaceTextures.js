// Shared studio surfaces for Drafts 2 and 4. Color maps are sRGB; data maps stay linear.
import * as THREE from 'three'
import brandLogo from '../assets/8BALL-V4.jpg'
import woodColor from '../assets/materials/walnut-color.webp'
import woodNormal from '../assets/materials/walnut-normal.webp'
import woodRoughness from '../assets/materials/walnut-roughness.webp'

// Soft radial Gaussian gradient for ball contact shadows and ambient occlusion.
export const createContactShadowTexture = ( anisotropy = 1 ) =>
{
  const canvas = document.createElement( 'canvas' )
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext( '2d' )
  const gradient = context.createRadialGradient( 64, 64, 0, 64, 64, 64 )
  gradient.addColorStop( 0, 'rgba(0, 0, 0, 0.95)' )
  gradient.addColorStop( 0.28, 'rgba(0, 0, 0, 0.8)' )
  gradient.addColorStop( 0.62, 'rgba(0, 0, 0, 0.25)' )
  gradient.addColorStop( 1, 'rgba(0, 0, 0, 0)' )
  context.fillStyle = gradient
  context.fillRect( 0, 0, 128, 128 )
  const texture = new THREE.CanvasTexture( canvas )
  texture.anisotropy = anisotropy
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

const smoothstep = ( edge0, edge1, value ) =>
{
  const t = Math.min( 1, Math.max( 0, ( value - edge0 ) / ( edge1 - edge0 ) ) )
  return t * t * ( 3 - 2 * t )
}

// Brand 8-ball decal: only the white glyph is kept so the ball's own resin shows around it.
export const createLogoTexture = ( anisotropy = 16, requestRender = () => {} ) =>
{
  const size = 1024
  const canvas = document.createElement( 'canvas' )
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext( '2d', { willReadFrequently: true } )
  const image = new Image()
  const texture = new THREE.CanvasTexture( canvas )
  let disposed = false
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy

  const paint = () =>
  {
    if ( disposed || !image.naturalWidth ) return
    context.clearRect( 0, 0, size, size )
    context.save()
    context.beginPath()
    context.arc( size / 2, size / 2, size * 0.449, 0, Math.PI * 2 )
    context.clip()
    context.drawImage( image, size * 0.047, size * 0.047, size * 0.906, size * 0.906 )
    context.restore()

    // Luminance becomes alpha: the logo's black disc turns transparent (no halo on the ball)
    // and the smoothstep band cleans JPEG ringing off the glyph edge.
    const pixels = context.getImageData( 0, 0, size, size )
    const data = pixels.data
    for ( let index = 0; index < data.length; index += 4 )
    {
      const luminance = ( data[ index ] * 0.2126 + data[ index + 1 ] * 0.7152 + data[ index + 2 ] * 0.0722 ) / 255
      data[ index + 3 ] = Math.round( data[ index + 3 ] * smoothstep( 0.35, 0.75, luminance ) )
      data[ index ] = data[ index + 1 ] = data[ index + 2 ] = 255
    }
    context.putImageData( pixels, 0, 0 )
    texture.needsUpdate = true
    requestRender?.()
  }

  texture.addEventListener( 'dispose', () =>
  {
    disposed = true
    image.onload = null
  } )

  image.onload = paint
  image.src = brandLogo
  if ( image.complete ) paint()
  return texture
}

// Ball numbers use Space Grotesk, the face index.html preloads on every page load: it is there by the
// first frame, so no Look downloads a second face (Archivo, 88 KB) just for the balls.
// Fallbacks cover the frame before the webfont arrives.
const BALL_NUMBER_FONT = '700 84px "Space Grotesk", "Helvetica Neue", Arial, sans-serif'

// Numbered pool ball canvas texture for solids and stripes.
export const createNumberedBallTexture = ( number, color, anisotropy = 16, requestRender = () => {} ) =>
{
  const canvas = document.createElement( 'canvas' )
  canvas.width = 1024
  canvas.height = 512
  const context = canvas.getContext( '2d' )
  const isStripe = number > 8
  const texture = new THREE.CanvasTexture( canvas )
  let disposed = false
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy

  const paint = () =>
  {
    context.fillStyle = isStripe ? '#faf6ee' : color
    context.fillRect( 0, 0, canvas.width, canvas.height )

    if ( isStripe )
    {
      context.fillStyle = color
      context.fillRect( 0, 118, canvas.width, 276 )
    }

    ;[ canvas.width * 0.25, canvas.width * 0.75 ].forEach( ( centerX ) =>
    {
      context.fillStyle = '#faf6ee'
      context.beginPath()
      context.arc( centerX, 256, 76, 0, Math.PI * 2 )
      context.fill()

      context.fillStyle = '#111214'
      context.font = BALL_NUMBER_FONT
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText( String( number ), centerX, 260 )
      if ( number === 6 || number === 9 )
      {
        context.fillRect( centerX - 24, 304, 48, 6 )
      }
    } )
  }

  paint()
  texture.addEventListener( 'dispose', () => { disposed = true } )
  // Canvas text silently falls back if the webfont is still loading, so repaint once it is ready.
  document.fonts?.load( BALL_NUMBER_FONT ).then( () =>
  {
    if ( disposed ) return
    paint()
    texture.needsUpdate = true
    requestRender?.()
  } ).catch( () => {} )
  return texture
}


// Deterministic 0..1 hash per lattice point, so every load paints the same cloth.
const hashLattice = ( x, y ) =>
{
  let h = Math.imul( x, 374761393 ) + Math.imul( y, 668265263 ) | 0
  h = Math.imul( h ^ h >>> 13, 1274126177 )
  return ( ( h ^ h >>> 16 ) >>> 0 ) / 4294967295
}

// Tileable value noise: lattice corners wrap at `period`, so each tile edge matches its opposite edge.
const tileableValueNoise = ( u, v, period ) =>
{
  const x = u * period
  const y = v * period
  const x0 = Math.floor( x )
  const y0 = Math.floor( y )
  const fx = x - x0
  const fy = y - y0
  const sx = fx * fx * ( 3 - 2 * fx )
  const sy = fy * fy * ( 3 - 2 * fy )
  const xa = x0 % period
  const ya = y0 % period
  const xb = ( x0 + 1 ) % period
  const yb = ( y0 + 1 ) % period
  const top = hashLattice( xa, ya ) + ( hashLattice( xb, ya ) - hashLattice( xa, ya ) ) * sx
  const bottom = hashLattice( xa, yb ) + ( hashLattice( xb, yb ) - hashLattice( xa, yb ) ) * sx
  return top + ( bottom - top ) * sy
}

// Three octaves of broad cloth mottling (dye and wear), weighted toward the largest blotches.
const feltMottle = ( u, v ) =>
  tileableValueNoise( u, v, 4 ) * 0.5 +
  tileableValueNoise( u, v, 9 ) * 0.3 +
  tileableValueNoise( u, v, 21 ) * 0.2

export const createFeltTextures = ( anisotropy = 16, microRepeatX = 38.4, microRepeatY = 76.8 ) =>
{
  const width = 512
  const height = 512
  const numThreads = 32 // 16 pixels per yarn thread
  const threadSize = width / numThreads

  const canvas = document.createElement( 'canvas' )
  const normalCanvas = document.createElement( 'canvas' )
  const roughnessCanvas = document.createElement( 'canvas' )

  canvas.width = width
  canvas.height = height
  normalCanvas.width = width
  normalCanvas.height = height
  roughnessCanvas.width = width
  roughnessCanvas.height = height

  const context = canvas.getContext( '2d' )
  const normalContext = normalCanvas.getContext( '2d' )
  const roughnessContext = roughnessCanvas.getContext( '2d' )

  const albedoImage = context.createImageData( width, height )
  const normalImage = normalContext.createImageData( width, height )
  const roughnessImage = roughnessContext.createImageData( width, height )

  const albedoData = albedoImage.data
  const normalData = normalImage.data
  const roughnessData = roughnessImage.data

  const heightMap = new Float32Array( width * height )

  // Step 1: Generate worsted wool yarn heightmap with weave, twist striations, and fiber nap
  for ( let y = 0; y < height; y += 1 )
  {
    const wy = Math.floor( y / threadSize )
    const ty = ( y % threadSize ) / threadSize
    const ny = ty * 2 - 1
    const hy = Math.sqrt( Math.max( 0, 1 - ny * ny ) )

    for ( let x = 0; x < width; x += 1 )
    {
      const wx = Math.floor( x / threadSize )
      const tx = ( x % threadSize ) / threadSize
      const nx = tx * 2 - 1
      const hx = Math.sqrt( Math.max( 0, 1 - nx * nx ) )

      // Over-1-Under-1 plain worsted weave pattern
      const warpOnTop = ( wx + wy ) % 2 === 0

      // Micro-fiber twist striation along each yarn bundle
      let twist = 0
      if ( warpOnTop )
      {
        const fiberPhase = ( y + nx * 3.6 ) * 0.48
        twist = Math.sin( fiberPhase ) * 0.075 * hy
      }
      else
      {
        const fiberPhase = ( x + ny * 3.6 ) * 0.48
        twist = Math.sin( fiberPhase ) * 0.075 * hx
      }

      // High-frequency wool fuzz / nap micro-noise
      const seed = ( ( x * 374761393 + y * 668265263 ) ^ ( x * y ) ) & 0xffffff
      const fuzz = ( ( seed % 1000 ) / 1000 - 0.5 ) * 0.05

      // Warp/weft interlocking yarn undulation
      let baseH = 0
      if ( warpOnTop )
      {
        const undulation = 0.65 + 0.35 * Math.cos( Math.PI * ny )
        baseH = hx * undulation * 0.84 + ( 1 - hy ) * 0.16
      }
      else
      {
        const undulation = 0.65 + 0.35 * Math.cos( Math.PI * nx )
        baseH = hy * undulation * 0.84 + ( 1 - hx ) * 0.16
      }

      const totalH = Math.max( 0, Math.min( 1, baseH + twist + fuzz ) )
      heightMap[ y * width + x ] = totalH
    }
  }

  // Step 2: Compute tangent-space normals from height gradient, plus albedo and roughness maps
  // Keep the weave below the silhouette scale; the grazing light should reveal it without
  // turning the table into a visibly embossed grid.
  const normalStrength = 0.9
  for ( let y = 0; y < height; y += 1 )
  {
    const ym1 = ( y - 1 + height ) % height
    const yp1 = ( y + 1 ) % height

    for ( let x = 0; x < width; x += 1 )
    {
      const xm1 = ( x - 1 + width ) % width
      const xp1 = ( x + 1 ) % width
      const idx = y * width + x
      const pixelIdx = idx * 4

      const hL = heightMap[ y * width + xm1 ]
      const hR = heightMap[ y * width + xp1 ]
      const hU = heightMap[ ym1 * width + x ]
      const hD = heightMap[ yp1 * width + x ]

      const dx = ( hR - hL ) * normalStrength
      const dy = ( hD - hU ) * normalStrength
      const len = Math.sqrt( dx * dx + dy * dy + 1.0 )
      const nx = -dx / len
      const ny = -dy / len
      const nz = 1.0 / len

      // Normal Map (RGB encoding [-1, 1] to [0, 255])
      normalData[ pixelIdx ] = Math.round( ( nx * 0.5 + 0.5 ) * 255 )
      normalData[ pixelIdx + 1 ] = Math.round( ( ny * 0.5 + 0.5 ) * 255 )
      normalData[ pixelIdx + 2 ] = Math.round( ( nz * 0.5 + 0.5 ) * 255 )
      normalData[ pixelIdx + 3 ] = 255

      // Neutral, low-frequency dye mottling (about ±7%) breaks up the flat CG slab look.
      // The fine weave stays out of the color map; the normal map alone carries fiber structure.
      const h = heightMap[ idx ]
      const mottle = ( feltMottle( x / width, y / height ) - 0.5 ) * 52
      albedoData[ pixelIdx ] = 226 + mottle
      albedoData[ pixelIdx + 1 ] = 230 + mottle
      albedoData[ pixelIdx + 2 ] = 224 + mottle
      albedoData[ pixelIdx + 3 ] = 255

      // Roughness Map: broad nap response with only a small yarn-to-yarn difference.
      const roughnessVal = Math.round( ( 0.96 - h * 0.05 ) * 255 )
      roughnessData[ pixelIdx ] = roughnessVal
      roughnessData[ pixelIdx + 1 ] = roughnessVal
      roughnessData[ pixelIdx + 2 ] = roughnessVal
      roughnessData[ pixelIdx + 3 ] = 255

    }
  }

  context.putImageData( albedoImage, 0, 0 )
  normalContext.putImageData( normalImage, 0, 0 )
  roughnessContext.putImageData( roughnessImage, 0, 0 )

  const map = new THREE.CanvasTexture( canvas )
  const normalMap = new THREE.CanvasTexture( normalCanvas )
  const roughnessMap = new THREE.CanvasTexture( roughnessCanvas )

  ;[ map, normalMap, roughnessMap ].forEach( ( texture ) =>
  {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = anisotropy
    // Mipmaps keep the woven surface stable at distance while linear filtering avoids hard tile edges.
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
  } )

  // Use different world-frequency bands: macro color, mid-scale nap, and fine weave detail.
  map.repeat.set( 1, 2 )
  roughnessMap.repeat.set( Math.max( 1, microRepeatX / 2 ), Math.max( 1, microRepeatY / 2 ) )
  normalMap.repeat.set( microRepeatX, microRepeatY )

  map.colorSpace = THREE.SRGBColorSpace
  normalMap.colorSpace = THREE.NoColorSpace
  roughnessMap.colorSpace = THREE.NoColorSpace
  return { map, normalMap, roughnessMap }
}


export const createBallSurfaceTextures = ( anisotropy = 16 ) =>
{
  const size = 256
  const normalCanvas = document.createElement( 'canvas' )
  const roughnessCanvas = document.createElement( 'canvas' )
  normalCanvas.width = size
  normalCanvas.height = size
  roughnessCanvas.width = size
  roughnessCanvas.height = size

  const normalContext = normalCanvas.getContext( '2d' )
  const roughnessContext = roughnessCanvas.getContext( '2d' )
  const normalImage = normalContext.createImageData( size, size )
  const roughnessImage = roughnessContext.createImageData( size, size )
  const heightMap = new Float32Array( size * size )

  // Two very low-amplitude grain bands break up the perfect clearcoat reflection without
  // making the balls look scratched or dirty at normal viewing distance.
  for ( let y = 0; y < size; y += 1 )
  {
    for ( let x = 0; x < size; x += 1 )
    {
      const diagonal = Math.sin( ( x * 0.16 + y * 0.11 ) * Math.PI * 2 ) * 0.018
      const crossGrain = Math.sin( ( x * 0.037 - y * 0.053 ) * Math.PI * 2 ) * 0.012
      heightMap[ y * size + x ] = 0.5 + diagonal + crossGrain
    }
  }

  const normalStrength = 0.72
  for ( let y = 0; y < size; y += 1 )
  {
    const ym1 = ( y - 1 + size ) % size
    const yp1 = ( y + 1 ) % size

    for ( let x = 0; x < size; x += 1 )
    {
      const xm1 = ( x - 1 + size ) % size
      const xp1 = ( x + 1 ) % size
      const idx = y * size + x
      const pixelIdx = idx * 4
      const dx = ( heightMap[ y * size + xp1 ] - heightMap[ y * size + xm1 ] ) * normalStrength
      const dy = ( heightMap[ yp1 * size + x ] - heightMap[ ym1 * size + x ] ) * normalStrength
      const len = Math.sqrt( dx * dx + dy * dy + 1 )

      normalImage.data[ pixelIdx ] = Math.round( ( -dx / len * 0.5 + 0.5 ) * 255 )
      normalImage.data[ pixelIdx + 1 ] = Math.round( ( -dy / len * 0.5 + 0.5 ) * 255 )
      normalImage.data[ pixelIdx + 2 ] = Math.round( ( 1 / len * 0.5 + 0.5 ) * 255 )
      normalImage.data[ pixelIdx + 3 ] = 255

      const variation = ( heightMap[ idx ] - 0.5 ) * 0.8
      const roughness = Math.max( 0.82, Math.min( 1, 0.91 - variation ) )
      roughnessImage.data[ pixelIdx ] = Math.round( roughness * 255 )
      roughnessImage.data[ pixelIdx + 1 ] = Math.round( roughness * 255 )
      roughnessImage.data[ pixelIdx + 2 ] = Math.round( roughness * 255 )
      roughnessImage.data[ pixelIdx + 3 ] = 255
    }
  }

  normalContext.putImageData( normalImage, 0, 0 )
  roughnessContext.putImageData( roughnessImage, 0, 0 )

  const normalMap = new THREE.CanvasTexture( normalCanvas )
  const roughnessMap = new THREE.CanvasTexture( roughnessCanvas )
  ;[ normalMap, roughnessMap ].forEach( ( texture ) =>
  {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set( 2.5, 2.5 )
    texture.anisotropy = anisotropy
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.colorSpace = THREE.NoColorSpace
  } )

  return { normalMap, roughnessMap }
}


export const createPocketLeatherTextures = ( anisotropy = 16 ) =>
{
  const size = 128
  const canvas = document.createElement( 'canvas' )
  const normalCanvas = document.createElement( 'canvas' )
  const roughnessCanvas = document.createElement( 'canvas' )
  canvas.width = size
  canvas.height = size
  normalCanvas.width = size
  normalCanvas.height = size
  roughnessCanvas.width = size
  roughnessCanvas.height = size

  const context = canvas.getContext( '2d' )
  const normalContext = normalCanvas.getContext( '2d' )
  const roughnessContext = roughnessCanvas.getContext( '2d' )
  const albedoImage = context.createImageData( size, size )
  const normalImage = normalContext.createImageData( size, size )
  const roughnessImage = roughnessContext.createImageData( size, size )
  const heightMap = new Float32Array( size * size )

  // Saddle leather has broad grain, then small pores that catch a little of the cavity fill.
  for ( let y = 0; y < size; y += 1 )
  {
    for ( let x = 0; x < size; x += 1 )
    {
      const grain = Math.sin( ( x * 0.06 + Math.sin( y * 0.08 ) * 1.6 ) * Math.PI * 2 ) * 0.035
      const pores = Math.sin( ( x * 0.31 + y * 0.23 ) * Math.PI * 2 ) * 0.012
      const height = 0.5 + grain + pores
      const idx = y * size + x
      const pixelIdx = idx * 4
      heightMap[ idx ] = height

      const value = 0.5 + grain * 4 + pores * 2
      // Keep the map neutral; the material color supplies the dark saddle-brown base.
      albedoImage.data[ pixelIdx ] = Math.round( 178 + value * 36 )
      albedoImage.data[ pixelIdx + 1 ] = Math.round( 174 + value * 32 )
      albedoImage.data[ pixelIdx + 2 ] = Math.round( 168 + value * 28 )
      albedoImage.data[ pixelIdx + 3 ] = 255

      const roughness = 0.72 - grain * 0.7 - pores * 0.5
      const roughnessValue = Math.round( Math.max( 0.62, Math.min( 0.86, roughness ) ) * 255 )
      roughnessImage.data[ pixelIdx ] = roughnessValue
      roughnessImage.data[ pixelIdx + 1 ] = roughnessValue
      roughnessImage.data[ pixelIdx + 2 ] = roughnessValue
      roughnessImage.data[ pixelIdx + 3 ] = 255
    }
  }

  const normalStrength = 0.58
  for ( let y = 0; y < size; y += 1 )
  {
    const ym1 = ( y - 1 + size ) % size
    const yp1 = ( y + 1 ) % size

    for ( let x = 0; x < size; x += 1 )
    {
      const xm1 = ( x - 1 + size ) % size
      const xp1 = ( x + 1 ) % size
      const idx = y * size + x
      const pixelIdx = idx * 4
      const dx = ( heightMap[ y * size + xp1 ] - heightMap[ y * size + xm1 ] ) * normalStrength
      const dy = ( heightMap[ yp1 * size + x ] - heightMap[ ym1 * size + x ] ) * normalStrength
      const len = Math.sqrt( dx * dx + dy * dy + 1 )

      normalImage.data[ pixelIdx ] = Math.round( ( -dx / len * 0.5 + 0.5 ) * 255 )
      normalImage.data[ pixelIdx + 1 ] = Math.round( ( -dy / len * 0.5 + 0.5 ) * 255 )
      normalImage.data[ pixelIdx + 2 ] = Math.round( ( 1 / len * 0.5 + 0.5 ) * 255 )
      normalImage.data[ pixelIdx + 3 ] = 255
    }
  }

  context.putImageData( albedoImage, 0, 0 )
  normalContext.putImageData( normalImage, 0, 0 )
  roughnessContext.putImageData( roughnessImage, 0, 0 )

  const map = new THREE.CanvasTexture( canvas )
  const normalMap = new THREE.CanvasTexture( normalCanvas )
  const roughnessMap = new THREE.CanvasTexture( roughnessCanvas )
  ;[ map, normalMap, roughnessMap ].forEach( ( texture ) =>
  {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set( 3, 5 )
    texture.anisotropy = anisotropy
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
  } )

  map.colorSpace = THREE.SRGBColorSpace
  normalMap.colorSpace = THREE.NoColorSpace
  roughnessMap.colorSpace = THREE.NoColorSpace
  return { map, normalMap, roughnessMap }
}


export const createStudioEnvironment = ( renderer ) =>
{
  const environmentScene = new THREE.Scene()
  environmentScene.background = new THREE.Color( '#040504' )
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

  // Asymmetric softboxes leave a broad dark interval so the resin reads as a sphere.
  addCard( new THREE.PlaneGeometry( 3.8, 7 ), '#fff4df', 2.6, [ -5, 7, 4 ] )
  addCard( new THREE.PlaneGeometry( 1.2, 8 ), '#d2e4dc', 1.4, [ 7, 4, -4 ] )
  addCard( new THREE.PlaneGeometry( 8, 0.5 ), '#f5d6a5', 1.2, [ 0, 5, -8 ] )
  addCard( new THREE.PlaneGeometry( 14, 24 ), '#284d3a', 0.25, [ 0, -1, 0 ], [ 0, 10, 0 ] )

  const generator = new THREE.PMREMGenerator( renderer )
  generator.compileCubemapShader()
  // Stay inside PMREM's sample budget; the enlarged strip supplies the softness without clipping.
  const target = generator.fromScene( environmentScene, 0.035 )
  resources.forEach( ( resource ) => resource.dispose() )
  generator.dispose()
  return target
}

// Locally hosted CC0 scan; placeholders preserve a complete material if an image fails.
// Updating an existing texture avoids recompiling a material when loading finishes.
// `size` is the GPU resolution: the 2K scans are downsampled into a 1K canvas on the low tier.
export const createWoodTextures = ( anisotropy = 8, requestRender = () => {}, size = 2048 ) =>
{
  const load = ( url, color, colorSpace ) =>
  {
    const canvas = document.createElement( 'canvas' )
    canvas.width = canvas.height = size
    const context = canvas.getContext( '2d' )
    context.fillStyle = color
    context.fillRect( 0, 0, canvas.width, canvas.height )
    const texture = new THREE.CanvasTexture( canvas )
    texture.colorSpace = colorSpace
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set( 1, 1 )
    texture.anisotropy = anisotropy
    texture.minFilter = THREE.LinearMipmapLinearFilter
    let disposed = false
    const image = new Image()
    image.onload = () =>
    {
      if ( disposed ) return
      context.drawImage( image, 0, 0, canvas.width, canvas.height )
      texture.needsUpdate = true
      requestRender()
    }
    texture.addEventListener( 'dispose', () =>
    {
      disposed = true
      image.onload = null
      image.src = ''
    } )
    image.src = url
    return texture
  }
  return {
    map: load( woodColor, '#856148', THREE.SRGBColorSpace ),
    normalMap: load( woodNormal, '#8080ff', THREE.NoColorSpace ),
    roughnessMap: load( woodRoughness, '#b0b0b0', THREE.NoColorSpace ),
  }
}
