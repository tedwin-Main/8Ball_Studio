// Three measured tiers spend pixels and full-screen effects according to the device budget.
// These caps only change internal render targets; the CSS canvas and camera framing stay fixed.
export const POOL_QUALITY_TIERS = Object.freeze( {
  high: Object.freeze( {
    id: 'high',
    pixelRatioCap: 1.5,
    shadowMapSize: 2048,
    useSsao: true,
    renderBudgetMs: 20,
    ballWidthSegments: 48,
    ballHeightSegments: 28,
    ballTextureWidth: 1024,
    ballTextureHeight: 512,
  } ),
  standard: Object.freeze( {
    id: 'standard',
    pixelRatioCap: 1.25,
    shadowMapSize: 1536,
    useSsao: true,
    renderBudgetMs: 24,
    ballWidthSegments: 40,
    ballHeightSegments: 24,
    ballTextureWidth: 768,
    ballTextureHeight: 384,
  } ),
  low: Object.freeze( {
    id: 'low',
    pixelRatioCap: 1,
    shadowMapSize: 1024,
    useSsao: false,
    renderBudgetMs: 32,
    ballWidthSegments: 32,
    ballHeightSegments: 20,
    ballTextureWidth: 512,
    ballTextureHeight: 256,
  } ),
} )

const QUALITY_ORDER = [ 'low', 'standard', 'high' ]

const getQualityRank = ( tierId ) => QUALITY_ORDER.indexOf( tierId )

export const getPoolQualitySignals = ( width, height ) =>
{
  const coarsePointer = window.matchMedia( '(pointer: coarse)' ).matches
  const deviceMemory = Number.isFinite( navigator.deviceMemory ) ? navigator.deviceMemory : null
  const hardwareConcurrency = Number.isFinite( navigator.hardwareConcurrency )
    ? navigator.hardwareConcurrency
    : null
  const saveData = Boolean( navigator.connection?.saveData )
  const isSmallViewport = width <= 768 || Math.min( width, height ) <= 640
  const lowPower = saveData || deviceMemory !== null && deviceMemory <= 4 || hardwareConcurrency !== null && hardwareConcurrency <= 4

  return {
    width,
    height,
    devicePixelRatio: window.devicePixelRatio || 1,
    coarsePointer,
    deviceMemory,
    hardwareConcurrency,
    saveData,
    isSmallViewport,
    lowPower,
  }
}

// Pick an initial tier from observable signals, then let measured render time refine it.
// Browser names are deliberately absent: viewport, density, input mode, and power hints are portable.
export const selectPoolQualityTier = ( signals ) =>
{
  if ( signals.coarsePointer || signals.isSmallViewport || signals.lowPower ) return 'low'
  if (
    signals.width >= 1200 &&
    signals.devicePixelRatio <= 1.5 &&
    ( signals.deviceMemory === null || signals.deviceMemory >= 8 ) &&
    ( signals.hardwareConcurrency === null || signals.hardwareConcurrency >= 8 )
  ) return 'high'
  return 'standard'
}

export const createQualityMonitor = ( initialTier, signals, applyTier ) =>
{
  let currentTier = initialTier
  let pendingTier = null
  let slowSamples = 0
  let healthySamples = 0
  const renderDurations = []
  const isUpgradeLocked = ( currentSignals ) =>
    currentSignals.coarsePointer || currentSignals.isSmallViewport || currentSignals.lowPower
  let upgradesLocked = isUpgradeLocked( signals )

  const setPendingTier = ( nextTier ) =>
  {
    if ( nextTier === currentTier )
    {
      pendingTier = null
      return
    }
    pendingTier = nextTier
  }

  const suggestFromSignals = ( nextSignals ) =>
  {
    // Recompute the lock after every resize so a desktop scene cannot later
    // promote itself while the viewport is small, coarse-pointer, or low-power.
    upgradesLocked = isUpgradeLocked( nextSignals )
    const suggestedTier = selectPoolQualityTier( nextSignals )
    const currentRank = getQualityRank( currentTier )
    const suggestedRank = getQualityRank( suggestedTier )

    // A resize can lower quality immediately at the next settled frame, but never raises
    // a mobile/low-power device into an SSAO tier just because a single frame was quick.
    if ( suggestedRank < currentRank || !upgradesLocked ) setPendingTier( suggestedTier )
  }

  const commitPending = ( sceneSettled ) =>
  {
    if ( !pendingTier || !sceneSettled ) return false
    currentTier = pendingTier
    pendingTier = null
    slowSamples = 0
    healthySamples = 0
    renderDurations.length = 0
    applyTier( currentTier )
    return true
  }

  const observe = ( durationMs, sceneSettled ) =>
  {
    if ( !Number.isFinite( durationMs ) ) return commitPending( sceneSettled )
    renderDurations.push( durationMs )
    if ( renderDurations.length > 12 ) renderDurations.shift()
    if ( renderDurations.length < 8 ) return commitPending( sceneSettled )

    const tier = POOL_QUALITY_TIERS[ currentTier ]
    const average = renderDurations.reduce( ( total, duration ) => total + duration, 0 ) / renderDurations.length
    // Hysteresis avoids tier thrash: sustained 18% over-budget cost drops after 6 samples,
    // while a much quieter 38% headroom must hold for 24 samples before quality can rise.
    if ( average > tier.renderBudgetMs * 1.18 && getQualityRank( currentTier ) > getQualityRank( 'low' ) )
    {
      slowSamples += 1
      healthySamples = 0
      if ( slowSamples >= 6 ) setPendingTier( QUALITY_ORDER[ getQualityRank( currentTier ) - 1 ] )
    }
    else if ( average < tier.renderBudgetMs * 0.62 && getQualityRank( currentTier ) < getQualityRank( 'high' ) && !upgradesLocked )
    {
      healthySamples += 1
      slowSamples = 0
      if ( healthySamples >= 24 ) setPendingTier( QUALITY_ORDER[ getQualityRank( currentTier ) + 1 ] )
    }
    else
    {
      slowSamples = 0
      healthySamples = 0
    }

    return commitPending( sceneSettled )
  }

  return {
    get current () { return currentTier },
    get pending () { return Boolean( pendingTier ) },
    observe,
    suggestFromSignals,
  }
}

