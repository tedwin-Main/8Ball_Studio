// Shared studio surfaces for Drafts 2 and 4. Color maps are sRGB; data maps stay linear.
import * as THREE from 'three'
import woodColor from '../assets/materials/walnut-color.jpg'
import woodNormal from '../assets/materials/walnut-normal.jpg'
import woodRoughness from '../assets/materials/walnut-roughness.jpg'

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

      // Neutral, low-frequency dye variation keeps the fine weave out of the color map.
      // Tiling remains seamless; the normal map alone carries the small fiber structure.
      const h = heightMap[ idx ]
      const dyeShift = Math.sin( x / width * Math.PI * 4 ) * Math.cos( y / height * Math.PI * 6 ) * 2
      const r = 226 + dyeShift
      const g = 230 + dyeShift
      const b = 224 + dyeShift

      albedoData[ pixelIdx ] = r
      albedoData[ pixelIdx + 1 ] = g
      albedoData[ pixelIdx + 2 ] = b
      albedoData[ pixelIdx + 3 ] = 255

      // Roughness Map: broad nap response with only a small yarn-to-yarn difference.
      const roughnessVal = Math.round( ( 0.96 - h * 0.05 + dyeShift * 0.002 ) * 255 )
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
export const createWoodTextures = ( anisotropy = 8, requestRender = () => {} ) =>
{
  const load = ( url, color, colorSpace ) =>
  {
    const canvas = document.createElement( 'canvas' )
    canvas.width = canvas.height = 1024
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
