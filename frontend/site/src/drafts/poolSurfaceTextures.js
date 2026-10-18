// Pool hero canvas textures: contact shadow, logo decal, numbered balls. Color maps are sRGB.
import * as THREE from 'three'
import brandLogo from '../assets/8BALL-V4.jpg'

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
