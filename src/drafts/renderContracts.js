// Shared visual contracts keep the Production and Cinematic Drafts in the same physical language.
// Values stay in documented ranges so a renderer can scale cost without changing meaning.
export const MATERIAL_CONTRACT = Object.freeze( {
  ball: Object.freeze( {
    roughness: 0.17,
    metalness: 0,
    clearcoat: 0.96,
    clearcoatRoughness: 0.045,
    ior: 1.54,
    reflectivity: 0.78,
  } ),
  decal: Object.freeze( {
    roughness: 0.17,
    metalness: 0,
    clearcoat: 0.94,
    clearcoatRoughness: 0.05,
    ior: 1.54,
  } ),
  felt: Object.freeze( {
    color: '#0A2C22',
    roughness: 0.9,
    sheen: 0.38,
    sheenRoughness: 0.58,
    normalStrength: 0.11,
    bumpScale: 0.0018,
  } ),
  rail: Object.freeze( {
    color: '#242A26',
    roughness: 0.28,
    clearcoat: 0.64,
    clearcoatRoughness: 0.12,
  } ),
  pocket: Object.freeze( {
    interiorColor: '#111512',
    bottomColor: '#0A0D0B',
    collarColor: '#242A26',
    roughness: 0.9,
  } ),
} )

// Light roles are intentionally few: warm key, low ambient/environment fill, cool rear rim.
export const LIGHTING_CONTRACT = Object.freeze( {
  balance: Object.freeze( { key: 1, ambient: 0.25, rim: 0.4 } ),
  key: Object.freeze( {
    color: '#E0A15A',
    intensity: 1.2,
    position: Object.freeze( [ -4.8, 8.8, 5.2 ] ),
  } ),
  ambient: Object.freeze( {
    skyColor: '#24483A',
    groundColor: '#050706',
    intensity: 0.25,
  } ),
  rim: Object.freeze( {
    color: '#79B8B2',
    intensity: 0.4,
    position: Object.freeze( [ 5.5, 4.8, -7.5 ] ),
  } ),
} )

// Tier budgets alter internal cost only; CSS bounds and Story framing remain invariant.
export const QUALITY_CONTRACT = Object.freeze( {
  high: Object.freeze( { pixelRatioCap: 1.5, ball: Object.freeze( [ 48, 32 ] ), texture: Object.freeze( [ 1024, 512 ] ), shadowMapSize: 2048 } ),
  standard: Object.freeze( { pixelRatioCap: 1.25, ball: Object.freeze( [ 40, 24 ] ), texture: Object.freeze( [ 768, 384 ] ), shadowMapSize: 1024 } ),
  low: Object.freeze( { pixelRatioCap: 1, ball: Object.freeze( [ 32, 20 ] ), texture: Object.freeze( [ 512, 256 ] ), shadowMapSize: 768 } ),
} )

