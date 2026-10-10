// Site copy and media. Facts only, taken from the studio's PRODUCT.md and the old site.
// Nothing here is invented: no testimonials, metrics, case studies, pricing or awards.

// Service media lives in src/assets/services (sample pieces, see SOURCES.json). Vite resolves the URLs at build time.
const MEDIA = import.meta.glob( './assets/services/*.{mp4,webp}', { eager: true, import: 'default' } )
const media = ( name ) => MEDIA[ `./assets/services/${name}` ]
// A reel piece for a strip tile: the clip plus its poster. A still piece is one image.
const reelPiece = ( name ) => ( { type: 'video', src: media( `${name}.mp4` ), poster: media( `${name}-poster.webp` ) } )
const stillPiece = ( name ) => ( { type: 'image', src: media( `${name}.webp` ) } )
// Each service's five-tile strip, in the old site's running order. Motion and stills alternate so the eye gets a rest.
const serviceMedia = ( slug, order ) => order.map( ( piece ) => ( piece.startsWith( 'reel' ) ? reelPiece( `${slug}-${piece}` ) : stillPiece( `${slug}-${piece}` ) ) )

// Each service: a reel (video + poster) and a still, shown in the horizontal accordion.
export const SERVICES = [
  {
    name: 'Video production',
    detail: 'Brand films, reels and short-form edits',
    reel: { src: media( 'video-reel.mp4' ), poster: media( 'video-reel-poster.webp' ) },
    still: media( 'video-still.webp' ),
    media: serviceMedia( 'video', [ 'reel-3', 'still', 'reel', 'still-2', 'reel-2' ] ),
  },
  {
    name: 'Graphic design',
    detail: 'Brand assets, social posts and print',
    reel: { src: media( 'design-reel.mp4' ), poster: media( 'design-reel-poster.webp' ) },
    still: media( 'design-still.webp' ),
    media: serviceMedia( 'design', [ 'still', 'reel', 'still-3', 'reel-2', 'still-2' ] ),
  },
  {
    name: 'Performance marketing',
    detail: 'Paid campaigns, tracked and tuned',
    reel: { src: media( 'marketing-reel.mp4' ), poster: media( 'marketing-reel-poster.webp' ) },
    still: media( 'marketing-still.webp' ),
    media: serviceMedia( 'marketing', [ 'reel', 'still', 'reel-3', 'still-2', 'reel-2' ] ),
  },
  {
    name: 'Social media management',
    detail: 'Calendars, posting and community',
    reel: { src: media( 'social-reel.mp4' ), poster: media( 'social-reel-poster.webp' ) },
    still: media( 'social-still.webp' ),
    media: serviceMedia( 'social', [ 'reel', 'still', 'reel-3', 'still-2', 'reel-2' ] ),
  },
  {
    name: 'Web design',
    detail: 'Websites and landing pages',
    reel: { src: media( 'web-reel.mp4' ), poster: media( 'web-reel-poster.webp' ) },
    still: media( 'web-still.webp' ),
    media: serviceMedia( 'web', [ 'still', 'reel', 'still-3', 'reel-2', 'still-2' ] ),
  },
  {
    name: 'AI generated content',
    detail: 'AI UGC, synthetic media, virtual production',
    reel: { src: media( 'ai-reel.mp4' ), poster: media( 'ai-reel-poster.webp' ) },
    still: media( 'ai-still.webp' ),
    media: serviceMedia( 'ai', [ 'reel', 'still', 'reel-3', 'still-2', 'reel-2' ] ),
  },
]

// Client logos, from the studio's real projects.
export const CLIENTS = [
  { name: 'Artigusto Gelato', src: new URL( './assets/Artigusto-Gelato_Clearned.webp', import.meta.url ).href },
  { name: 'ERS Energy', src: new URL( './assets/ers-energy-logo.png', import.meta.url ).href },
  { name: 'Haruplate', src: new URL( './assets/haruplate-logo.png', import.meta.url ).href },
  { name: 'Shopee', src: new URL( './assets/shopee-logo.svg', import.meta.url ).href },
]

// The one primary way to reach the studio: local brands message on WhatsApp first.
export const PRIMARY_CONTACT = {
  label: 'Message us on WhatsApp',
  number: '+60 12-783 7511',
  href: 'https://wa.me/60127837511',
}

export const CONTACT_CHANNELS = [
  { title: 'Instagram', value: '@8ightball.studio', href: 'https://www.instagram.com/8ightball.studio/' },
  { title: 'Email', value: '8ightball.studio@gmail.com', href: 'mailto:8ightball.studio@gmail.com' },
]

// The statement's inline pictures: small stills set inside the big heading.
export const PILL_IMAGES = {
  social: media( 'social-reel-poster.webp' ),
  kl: media( 'video-still.webp' ),
}

// Copy for the scroll-revealed paragraph (Desire). Every sentence states something the studio does.
export const MANIFESTO = 'We make video, design, web, social and AI content for local brands and regional teams. Tell us what the brand needs, and we reply on WhatsApp, Instagram or email with the next step.'
