// One editable contract owns scroll-story timing; callers consume the resolved schedule.

// Ensure a numeric value is finite and not negative.
function finiteNonNegative( value, name )
{
  if ( !Number.isFinite( value ) || value < 0 )
  {
    throw new RangeError( `${name} must be a finite, non-negative number.` )
  }
  return value
}

// Ensure a progress value is a number between 0.0 and 1.0.
function assertProgress( value, name )
{
  finiteNonNegative( value, name )
  if ( value > 1 )
  {
    throw new RangeError( `${name} must be between 0 and 1.` )
  }
  return value
}

// Ensure a value is strictly greater than zero.
function assertPositive( value, name )
{
  finiteNonNegative( value, name )
  if ( value === 0 )
  {
    throw new RangeError( `${name} must be greater than zero.` )
  }
  return value
}

// Validate that an animation window starts and ends within normalized progress (0 to 1).
function assertWindow( start, duration, name )
{
  assertProgress( start, `${name} start` )
  assertProgress( start + duration, `${name} end` )
}

// Validate all numeric dictionary entries are finite and non-negative.
function validateNumericEntries( entries, prefix, skipKeys = [] )
{
  for ( const name in entries )
  {
    if ( !skipKeys.includes( name ) )
    {
      finiteNonNegative( entries[ name ], `${prefix}.${name}` )
    }
  }
}

// Mirrors the two Studio title spans rendered by App.jsx.
const FINAL_TITLE_LINE_COUNT = 2

function freeze( value )
{
  return Object.freeze( value )
}

// Edit these semantic values while Vite is running; all dependent progress is derived below.
// The scrubbed timeline covers only the pinned stage: the Intro break (unit 0 to 1, where Studio is
// lit) plus a short Studio hold. After it the stage releases and Studio, Projects, and Contact scroll
// as normal sections, so totalTimelineUnits is derived (1 + pages.studioReleaseHold), not configured.
export const STORY_TIMING_DEFAULTS = freeze( {
  // Shared progress tolerance keeps cue gates and page indicators from disagreeing at boundaries.
  progressEpsilon: 0.0005,
  // Scroll input controls are deliberately separate from animation phase lengths.
  scroll: freeze( {
    // Blend the 8-ball's approach between linear and the shared weighted curve (0 = linear, 1 = full curve).
    introWeight: 0.72,
    // Screens of scroll per timeline unit on the pinned stage. More scroll per cue means each wheel
    // notch moves the Intro break less; the flow sections after it always scroll 1:1.
    viewportsPerUnit: 3,
    // Lenis values match rockstargames.com/VI exactly (its live ReactLenis options, read 2026-09-24).
    // lerp: each 60fps frame closes 7% of the remaining distance, so the page glides after input.
    // No duration/easing on purpose: in Lenis those override lerp and turn every flick into a fixed-length glide.
    lerp: 0.07,
    // One wheel tick travels 1.2x its raw delta.
    wheelMultiplier: 1.2,
    // Touch values only apply in paged mode (freeScroll: false), where Lenis owns touch.
    // Free scroll leaves touch to native momentum, as the reference site does (syncTouch: false).
    touchMultiplier: 1,
    syncTouchLerp: 0.075,
    touchInertiaExponent: 1.7,
    // GSAP scrub catch-up in seconds: the Intro → Studio cue trails the smoothed scroll for extra weight.
    scrubSeconds: 1.2,
  } ),
  // Programmatic autoplay and gesture qualification live here so every input source
  // uses the same stable-page contract. Durations are seconds; threshold/reset are px/ms.
  navigation: freeze( {
    // Lengthened to 3.0s so the 2.55s physical break scatter unfolds at genuine 1:1 real-life speed during page transition.
    introToStudioSeconds: 3.0,
    // Reverse Intro playback keeps its dedicated weighted settle duration.
    studioToIntroSeconds: 1.6,
    // Glides between Studio, Projects, and Contact (nav links, keys) use one duration.
    defaultEdgeSeconds: 1.2,
    // Small touch/wheel noise must not start a page transition.
    gestureThresholdPx: 14,
    // Reset a wheel burst after input has gone idle.
    gestureResetMs: 120,
    // Continuous scrolling through the whole Story (true), or one Page per gesture (false).
    freeScroll: true,
  } ),
  intro: freeze( {
    // Legacy cue values remain available for compatibility; the live scene now rolls on the first swipe.
    // Duration from story start to the historical cue-ready checkpoint.
    cueReadyDuration: 0.24,
    cueReleaseEpsilon: 0.002,
    // Shared approach and break timings are timeline progress units. Both drafts now move on the first swipe.
    approachDuration: 0.28,
    draft1ScatterDuration: 0.22,
    // Scaled to 0.16 so the Studio crossfade takes 0.48s in real time during the 3.0s Intro transition.
    draft1TransitionDuration: 0.16,
    // Draft 2 uses the same readable spread and fade window; App.jsx handles its short handoff assist.
    draft2ScatterDuration: 0.22,
    // Scaled to 0.16 so Draft 2 title and 3D exit handoff take 0.48s in real time during the 3.0s Intro transition.
    draft2TransitionDuration: 0.16,
    draft2PocketCutLead: 0.04,
    // Lenis duration is seconds, not scroll-story progress.
    draft1BreakTransitionSeconds: 1.8,
    // Lenis uses seconds for Draft 2's short programmatic handoff after a soft swipe.
    draft2HandoffSeconds: 0.2,
    // Cue motion values are local intro progress, not physics seconds.
    cueStrikeProgress: 0.07,
    cueRecoilDelay: 0.055,
    cueRecoilProgress: 0.16,
    cueFadeDelay: 0.2,
    cueFadeDuration: 0.14,
    cueHideProgress: 0.004,
    // Small GSAP beats stay here as duration/delay controls; starts are derived below.
    visual: freeze( {
      tableOpenDuration: 0.42,
      heroFadeDelay: 0.03,
      heroFadeDuration: 0.28,
      promptFadeDelay: 0.05,
      promptFadeDuration: 0.2,
      cameraGridDuration: 0.7,
      draft2TableSettleProgress: 0.04,
      cueApproachDuration: 0.18,
      tableScaleLeadDuration: 0.1,
      tableScaleDuration: 0.26,
      cueStrikeDelay: 0.02,
      cueStrikeDuration: 0.08,
      ballCompressDelay: 0.02,
      ballCompressDuration: 0.04,
      ballRestoreDuration: 0.05,
      cueRecoilDuration: 0.14,
      ballPocketDelay: 0.02,
      ballPocketDuration: 0.14,
      ballVanishDuration: 0.04,
      pocketIrisDuration: 0.18,
      // 0.088 timeline units = 0.264s in real time at 3.0s Intro transition, matching Projects title reveal speed.
      titleLineDuration: 0.088,
      titleLineStagger: 0.015,
      metaDelay: 0.06,
      metaDuration: 0.06,
      timelineEndEpsilon: 0.005,
    } ),
  } ),
  pages: freeze( {
    // Pinned hold after the Studio cue settles, before the stage releases into normal scroll, so
    // Studio reads as a finished frame. 0.17 units is about half a screen at viewportsPerUnit 3.
    studioReleaseHold: 0.17,
    // Studio camera move, linear in scroll from the cue to the release, so no wheel notch lands on a
    // frozen frame. Foreground rise in vh per timeline unit; zero offset at Studio's stable mark.
    driftVhPerUnit: 10,
    // Cyc wall push-in: scale gained per timeline unit (the wall starts at 1, so it always fills the frame).
    wallPushPerUnit: 0.06,
    // Keeps the GSAP timeline exactly as long as the pinned stage.
    timelineEndEpsilon: 0.01,
  } ),
} )

// Merge default timing configuration with custom overrides.
function merge( overrides = {} )
{
  const overrideScroll = overrides.scroll || {}
  const overrideNav = overrides.navigation || {}
  const overrideIntro = overrides.intro || {}
  const overrideVisual = overrideIntro.visual || {}
  const overridePages = overrides.pages || {}

  return {
    ...STORY_TIMING_DEFAULTS,
    ...overrides,
    scroll: {
      ...STORY_TIMING_DEFAULTS.scroll,
      ...overrideScroll,
    },
    navigation: {
      ...STORY_TIMING_DEFAULTS.navigation,
      ...overrideNav,
    },
    intro: {
      ...STORY_TIMING_DEFAULTS.intro,
      ...overrideIntro,
      visual: {
        ...STORY_TIMING_DEFAULTS.intro.visual,
        ...overrideVisual,
      },
    },
    pages: {
      ...STORY_TIMING_DEFAULTS.pages,
      ...overridePages,
    },
  }
}

// Validate that all timeline milestones are valid and in strictly increasing order.
function validateSchedule( schedule )
{
  if ( schedule.totalTimelineUnits <= 0 )
  {
    throw new RangeError( 'totalTimelineUnits must be greater than zero.' )
  }

  if ( schedule.pages.draft2StudioStart <= schedule.pages.studioStart || schedule.pages.draft2StudioStart >= schedule.pages.studioStable )
  {
    throw new RangeError( 'Draft 2 Studio threshold must stay between its handoff and the Studio stable mark.' )
  }

  if ( schedule.pages.cinematicStudioStart >= schedule.pages.studioStable )
  {
    throw new RangeError( 'both intro handoffs must finish before Studio is stable.' )
  }

  const milestones = [
    schedule.pages.studioStart,
    schedule.pages.draft2StudioStart,
    schedule.pages.cinematicStudioStart,
    schedule.pages.studioStable,
    schedule.pages.releaseEnd,
    schedule.pages.timelineEndStart,
  ]

  // Milestones must fit inside total timeline units.
  for ( let i = 0; i < milestones.length; i++ )
  {
    if ( milestones[ i ] > schedule.totalTimelineUnits )
    {
      throw new RangeError( 'page schedule must fit inside totalTimelineUnits.' )
    }
  }

  if ( schedule.pages.timelineEndStart < 0 )
  {
    throw new RangeError( 'pages.timelineEndEpsilon leaves no timeline end.' )
  }

  if ( schedule.pages.timelineEndEpsilon > schedule.totalTimelineUnits )
  {
    throw new RangeError( 'pages.timelineEndEpsilon must fit inside totalTimelineUnits.' )
  }

  // Validate navigation settings are non-negative numbers (freeScroll is the one boolean switch).
  validateNumericEntries( schedule.navigation, 'navigation', [ 'freeScroll' ] )
}

// Resolve once at module load or when an override is supplied; never rebuild this in render loops.
export function resolveStoryTiming( overrides = {} )
{
  const input = merge( overrides )
  assertProgress( input.progressEpsilon, 'progressEpsilon' )

  // Validate all configuration numbers are valid and non-negative.
  validateNumericEntries( input.scroll, 'scroll' )
  // Zero would collapse the Story to one screen with no scroll range.
  assertPositive( input.scroll.viewportsPerUnit, 'scroll.viewportsPerUnit' )
  validateNumericEntries( input.navigation, 'navigation', [ 'freeScroll' ] )
  if ( typeof input.navigation.freeScroll !== 'boolean' )
  {
    throw new TypeError( 'navigation.freeScroll must be a boolean.' )
  }
  validateNumericEntries( input.intro, 'intro', [ 'visual' ] )
  validateNumericEntries( input.intro.visual, 'intro.visual' )
  validateNumericEntries( input.pages, 'pages' )

  const cueReady = assertProgress( input.intro.cueReadyDuration, 'intro.cueReadyDuration' )
  const approachEnd = assertProgress( input.intro.approachDuration, 'intro.approachDuration' )
  const impact = approachEnd
  const draft1TransitionReady = assertProgress(
    approachEnd + input.intro.draft1ScatterDuration,
    'intro.draft1 scatter end',
  )
  const draft1TransitionDuration = assertPositive(
    input.intro.draft1TransitionDuration,
    'intro.draft1TransitionDuration',
  )
  const draft1ExitEnd = assertProgress(
    draft1TransitionReady + draft1TransitionDuration,
    'intro.draft1 transition end',
  )
  const draft2TransitionReady = assertProgress(
    approachEnd + input.intro.draft2ScatterDuration,
    'intro.draft2 scatter end',
  )
  const draft2TransitionDuration = assertPositive(
    input.intro.draft2TransitionDuration,
    'intro.draft2TransitionDuration',
  )
  const draft2ExitEnd = assertProgress(
    draft2TransitionReady + draft2TransitionDuration,
    'intro.draft2 transition end',
  )
  const draft2PocketCut = finiteNonNegative(
    draft2TransitionReady - input.intro.draft2PocketCutLead,
    'intro.draft2 pocket cut',
  )
  if ( cueReady > approachEnd )
  {
    throw new RangeError( 'intro.cueReadyDuration must occur before impact.' )
  }
  const cueRelease = assertProgress(
    cueReady + input.intro.cueReleaseEpsilon,
    'cue.release',
  )
  const cueStrikeProgress = assertPositive( input.intro.cueStrikeProgress, 'intro.cueStrikeProgress' )
  const cueRecoilProgress = assertPositive( input.intro.cueRecoilProgress, 'intro.cueRecoilProgress' )
  const cueFadeDuration = assertPositive( input.intro.cueFadeDuration, 'intro.cueFadeDuration' )
  assertProgress( input.intro.cueRecoilDelay, 'intro.cueRecoilDelay' )
  assertProgress( input.intro.cueFadeDelay, 'intro.cueFadeDelay' )
  const cueHideProgress = assertProgress( input.intro.cueHideProgress, 'intro.cueHideProgress' )
  assertWindow( cueReady, cueStrikeProgress, 'cue strike' )
  assertWindow( cueReady + input.intro.cueRecoilDelay, cueRecoilProgress, 'cue recoil' )
  assertWindow( cueReady + input.intro.cueFadeDelay, cueFadeDuration, 'cue fade' )
  const visual = input.intro.visual
  const cueStrikeStart = impact + visual.cueStrikeDelay
  const ballCompressStart = cueStrikeStart + visual.ballCompressDelay
  const ballRestoreStart = ballCompressStart + visual.ballCompressDuration
  const cueRecoilStart = cueStrikeStart + visual.cueStrikeDuration
  const ballPocketStart = cueRecoilStart + visual.ballPocketDelay
  const ballVanishStart = ballPocketStart + visual.ballPocketDuration
  const pocketIrisStart = ballVanishStart + visual.ballVanishDuration
  const titleLineStart = pocketIrisStart
  const titleLineEnd = titleLineStart + visual.titleLineDuration + ( visual.titleLineStagger * ( FINAL_TITLE_LINE_COUNT - 1 ) )
  const visualSchedule = {
    ...visual,
    draft2TableSettleProgress: assertProgress( visual.draft2TableSettleProgress, 'intro.visual.draft2TableSettleProgress' ),
    cueApproachStart: approachEnd - visual.cueApproachDuration,
    tableScaleStart: approachEnd - visual.tableScaleLeadDuration,
    cueStrikeStart,
    ballCompressStart,
    ballRestoreStart,
    cueRecoilStart,
    ballPocketStart,
    ballVanishStart,
    pocketIrisStart,
    titleLineStart,
    titleLineEnd,
    metaStart: pocketIrisStart + visual.metaDelay,
  }
  const visualWindows = [
    [ 'table open', 0, visual.tableOpenDuration ],
    [ 'hero fade', visual.heroFadeDelay, visual.heroFadeDuration ],
    [ 'scroll prompt fade', visual.promptFadeDelay, visual.promptFadeDuration ],
    [ 'camera grid', 0, visual.cameraGridDuration ],
    [ 'cue approach', visualSchedule.cueApproachStart, visual.cueApproachDuration ],
    [ 'table scale', visualSchedule.tableScaleStart, visual.tableScaleDuration ],
    [ 'cue strike', visualSchedule.cueStrikeStart, visual.cueStrikeDuration ],
    [ 'ball compress', visualSchedule.ballCompressStart, visual.ballCompressDuration ],
    [ 'ball restore', visualSchedule.ballRestoreStart, visual.ballRestoreDuration ],
    [ 'cue recoil', visualSchedule.cueRecoilStart, visual.cueRecoilDuration ],
    [ 'ball pocket', visualSchedule.ballPocketStart, visual.ballPocketDuration ],
    [ 'ball vanish', visualSchedule.ballVanishStart, visual.ballVanishDuration ],
    [ 'pocket iris', visualSchedule.pocketIrisStart, visual.pocketIrisDuration ],
    [ 'title line', visualSchedule.titleLineStart, visualSchedule.titleLineEnd - visualSchedule.titleLineStart ],
    [ 'final meta', visualSchedule.metaStart, visual.metaDuration ],
    [ 'intro tail', 1 - visual.timelineEndEpsilon, visual.timelineEndEpsilon ],
  ]

  for ( const [ windowName, windowStart, windowDuration ] of visualWindows )
  {
    assertWindow( windowStart, windowDuration, windowName )
  }
  // Studio is lit at unit 1; the pinned stage holds it a little longer, then releases.
  const studioStable = 1
  const releaseEnd = studioStable + input.pages.studioReleaseHold
  const totalTimelineUnits = releaseEnd
  // Resolve this timeline-unit threshold here so App.jsx never rebuilds a Draft 2 boundary.
  const draft2StudioStart = draft2TransitionReady + input.progressEpsilon * totalTimelineUnits
  const pageSchedule = {
    studioStart: draft2TransitionReady,
    draft2StudioStart,
    cinematicStudioStart: draft1TransitionReady,
    studioStable,
    releaseEnd,
    timelineEndStart: totalTimelineUnits - input.pages.timelineEndEpsilon,
  }

  const schedule = freeze( {
    ...input,
    totalTimelineUnits,
    navigation: freeze( { ...input.navigation } ),
    cue: freeze( {
      ready: cueReady,
      release: cueRelease,
      strikeProgress: cueStrikeProgress,
      recoilDelay: input.intro.cueRecoilDelay,
      recoilProgress: cueRecoilProgress,
      fadeDelay: input.intro.cueFadeDelay,
      fadeDuration: cueFadeDuration,
      hideThreshold: cueHideProgress,
    } ),
    intro: freeze( {
      ...input.intro,
      visual: freeze( visualSchedule ),
      approachEnd,
      impact,
      draft1: freeze( {
        approachEnd,
        impact,
        transitionReady: draft1TransitionReady,
        exitStart: draft1TransitionReady,
        transitionDuration: draft1TransitionDuration,
        transitionDurationProgress: draft1TransitionDuration / totalTimelineUnits,
        exitEnd: draft1ExitEnd,
        studioHandoff: draft1ExitEnd,
      } ),
      draft2: freeze( {
        approachEnd,
        impact,
        transitionReady: draft2TransitionReady,
        exitStart: draft2TransitionReady,
        transitionDuration: draft2TransitionDuration,
        transitionDurationProgress: draft2TransitionDuration / totalTimelineUnits,
        exitEnd: draft2ExitEnd,
        studioHandoff: draft2ExitEnd,
        pocketCut: draft2PocketCut,
      } ),
    } ),
    pages: freeze( { ...input.pages, ...pageSchedule } ),
  } )

  validateSchedule( schedule )
  return schedule
}

export const STORY_TIMING = resolveStoryTiming()

// Cinematic smooth-step easing curve.
export function easeCinematicBreakTransition( progress )
{
  return progress * progress * ( 3 - 2 * progress )
}

// Normalized smooth-step easing curve for requested Page glides.
export function easeStoryTransition( progress )
{
  return progress * progress * ( 3 - 2 * progress )
}

// Blend a progress value between linear and smooth easing based on weight.
export function easeWeightedProgress( progress, weight = STORY_TIMING.scroll.introWeight )
{
  const normalizedProgress = assertProgress( progress, 'progress' )
  const validWeight = finiteNonNegative( weight, 'weight' )
  const clampedWeight = Math.min( 1, Math.max( 0, validWeight ) )

  const easedProgress = easeStoryTransition( normalizedProgress )
  const weightedOffset = ( easedProgress - normalizedProgress ) * clampedWeight

  return normalizedProgress + weightedOffset
}

// Convert timeline units to normalized 0.0 - 1.0 progress through the pinned stage.
export function toStoryProgress( timelineUnit )
{
  const validUnit = finiteNonNegative( timelineUnit, 'timelineUnit' )
  const normalized = validUnit / STORY_TIMING.totalTimelineUnits
  return assertProgress( normalized, 'storyProgress' )
}

// Convert normalized 0.0 - 1.0 pinned-stage progress to timeline units.
export function toTimelineUnits( storyProgress )
{
  const validProgress = assertProgress( storyProgress, 'storyProgress' )
  return validProgress * STORY_TIMING.totalTimelineUnits
}
