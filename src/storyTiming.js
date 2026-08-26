// One editable contract owns scroll-story timing; callers consume the resolved schedule.

const finiteNonNegative = ( value, name ) =>
{
  if ( !Number.isFinite( value ) || value < 0 )
  {
    throw new RangeError( `${name} must be a finite, non-negative number.` )
  }

  return value
}

const assertProgress = ( value, name ) =>
{
  finiteNonNegative( value, name )
  if ( value > 1 ) throw new RangeError( `${name} must be between 0 and 1.` )
  return value
}

const assertPositive = ( value, name ) =>
{
  finiteNonNegative( value, name )
  if ( value === 0 ) throw new RangeError( `${name} must be greater than zero.` )
  return value
}

const assertWindow = ( start, duration, name ) =>
{
  assertProgress( start, `${name} start` )
  assertProgress( start + duration, `${name} end` )
}

// These counts mirror the fixed title spans and contact cards rendered by App.jsx.
const PROJECTS_TITLE_LINE_COUNT = 2
const CONTACT_TITLE_LINE_COUNT = 2
const FINAL_TITLE_LINE_COUNT = 2
const CONTACT_ITEM_COUNT = 3
const freeze = ( value ) => Object.freeze( value )

// Edit these semantic values while Vite is running; all dependent progress is derived below.
export const STORY_TIMING_DEFAULTS = freeze( {
  // Timeline units map to normalized story progress through totalTimelineUnits.
  totalTimelineUnits: 3,
  // Shared progress tolerance keeps cue gates and page indicators from disagreeing at boundaries.
  progressEpsilon: 0.0005,
  // Scroll input controls are deliberately separate from animation phase lengths.
  scroll: freeze( {
    introWeight: 0.72,
    wheelMultiplier: 0.4,
    lerp: 0.085,
    syncTouchLerp: 0.06,
  } ),
  intro: freeze( {
    // Draft 1 cue values keep the first swipe parked behind the 8-ball.
    // Duration from story start to the cue-ready checkpoint.
    cueReadyDuration: 0.24,
    cueReleaseEpsilon: 0.002,
    // Shared approach and Draft 1 break timings are timeline progress units.
    approachDuration: 0.52,
    draft1ScatterDuration: 0.24,
    draft1TransitionDuration: 0.14,
    // Draft 2 cuts the pocket-drop hold after the rack reaches readable spread.
    draft2ScatterDuration: 0.16,
    draft2TransitionDuration: 0.06,
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
      titleLineDuration: 0.1,
      titleLineStagger: 0.012,
      metaDelay: 0.06,
      metaDuration: 0.06,
      timelineEndEpsilon: 0.005,
    } ),
  } ),
  pages: freeze( {
    // Studio occupies timeline unit 1; these are the readable holds before later pages.
    studioHold: 0.16,
    studioRevealDuration: 0.52,
    // Delay before the Studio title starts fading as Projects appears.
    projectsFadeDelay: 0.04,
    projectsFadeDuration: 0.46,
    projectsTitleDelay: 0.41,
    projectsTitleDuration: 0.22,
    projectsTitleStagger: 0.04,
    projectsHold: 0.14,
    // Contact reveal is measured from the Projects stable mark.
    contactRevealDuration: 0.56,
    // The readable Contact hold is independent from the overall story length.
    contactHoldDuration: 0.3,
    contactFadeDelay: 0.04,
    contactFadeDuration: 0.5,
    contactTitleDelay: 0.38,
    contactTitleDuration: 0.24,
    contactTitleStagger: 0.04,
    contactItemsDelay: 0.53,
    contactItemDuration: 0.2,
    contactItemStagger: 0.05,
    // Keeps the GSAP timeline exactly as long as the configured story.
    timelineEndEpsilon: 0.01,
  } ),
} )

const merge = ( overrides = {} ) => ( {
  ...STORY_TIMING_DEFAULTS,
  ...overrides,
  scroll: { ...STORY_TIMING_DEFAULTS.scroll, ...overrides.scroll },
  intro: {
    ...STORY_TIMING_DEFAULTS.intro,
    ...overrides.intro,
    visual: { ...STORY_TIMING_DEFAULTS.intro.visual, ...overrides.intro?.visual },
  },
  pages: { ...STORY_TIMING_DEFAULTS.pages, ...overrides.pages },
} )

const validateSchedule = ( schedule ) =>
{
  if ( schedule.totalTimelineUnits <= 0 )
  {
    throw new RangeError( 'totalTimelineUnits must be greater than zero.' )
  }

  const starts = [
    schedule.pages.studioStart,
    schedule.pages.draft2StudioStart,
    schedule.pages.projectsStart,
    schedule.pages.contactStart,
  ]
  if ( starts.some( ( value, index ) => index > 0 && value <= starts[ index - 1 ] ) )
  {
    throw new RangeError( 'page starts must be strictly increasing.' )
  }

  if ( schedule.pages.cinematicStudioStart >= schedule.pages.projectsStart )
  {
    throw new RangeError( 'both intro handoffs must finish before Projects.' )
  }

  if ( schedule.pages.draft2StudioStart <= schedule.pages.studioStart || schedule.pages.draft2StudioStart >= schedule.pages.projectsStart )
  {
    throw new RangeError( "Draft 2 Studio threshold must stay between its handoff and Projects." )
  }

  if ( schedule.pages.projectsFadeEnd > schedule.pages.projectsStable || schedule.pages.projectsTitleEnd > schedule.pages.projectsStable )
  {
    throw new RangeError( 'Projects content must finish before its stable mark.' )
  }

  if ( schedule.pages.contactFadeEnd > schedule.pages.contactStable )
  {
    throw new RangeError( 'Contact fade must finish before its stable mark.' )
  }

  if ( schedule.pages.contactTitleEnd > schedule.pages.contactStable || schedule.pages.contactItemsEnd > schedule.pages.contactStable )
  {
    throw new RangeError( 'Contact content must finish before its stable mark.' )
  }

  const milestones = [
    schedule.pages.studioStart,
    schedule.pages.draft2StudioStart,
    schedule.pages.cinematicStudioStart,
    schedule.pages.projectsStart,
    schedule.pages.contactStart,
    schedule.pages.projectsFadeStart,
    schedule.pages.projectsFadeEnd,
    schedule.pages.projectsTitleStart,
    schedule.pages.projectsTitleEnd,
    schedule.pages.contactRevealEnd,
    schedule.pages.contactStable,
    schedule.pages.contactFadeStart,
    schedule.pages.contactFadeEnd,
    schedule.pages.contactTitleStart,
    schedule.pages.contactTitleEnd,
    schedule.pages.contactItemsStart,
    schedule.pages.contactItemsEnd,
    schedule.pages.timelineEndStart,
  ]
  if ( milestones.some( ( value ) => value > schedule.totalTimelineUnits ) )
  {
    throw new RangeError( 'page schedule must fit inside totalTimelineUnits.' )
  }

  if ( schedule.pages.timelineEndStart < 0 )
  {
    throw new RangeError( 'pages.timelineEndEpsilon leaves no timeline end.' )
  }

  if ( schedule.pages.timelineEndEpsilon > schedule.totalTimelineUnits )
  {
    throw new RangeError( 'pages.timelineEndEpsilon must fit inside totalTimelineUnits.' )
  }
}

// Resolve once at module load or when an override is supplied; never rebuild this in render loops.
export const resolveStoryTiming = ( overrides = {} ) =>
{
  const input = merge( overrides )
  finiteNonNegative( input.totalTimelineUnits, 'totalTimelineUnits' )
  assertProgress( input.progressEpsilon, 'progressEpsilon' )

  Object.entries( input.scroll ).forEach( ( [ name, value ] ) =>
  {
    finiteNonNegative( value, `scroll.${name}` )
  } )

  Object.entries( input.intro ).forEach( ( [ name, value ] ) =>
  {
    if ( name === 'visual' ) return
    finiteNonNegative( value, `intro.${name}` )
  } )
  Object.entries( input.intro.visual ).forEach( ( [ name, value ] ) =>
  {
    finiteNonNegative( value, `intro.visual.${name}` )
  } )

  Object.entries( input.pages ).forEach( ( [ name, value ] ) =>
  {
    finiteNonNegative( value, `pages.${name}` )
  } )

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
  ;[
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
  ].forEach( ( [ name, start, duration ] ) => assertWindow( start, duration, name ) )
  const projectsStart = 1 + finiteNonNegative( input.pages.studioHold, 'pages.studioHold' )
  // Each later page owns one full timeline unit; holds are measured from that page's stable mark.
  const contactStart = 2 + finiteNonNegative( input.pages.projectsHold, 'pages.projectsHold' )
  const contactRevealEnd = contactStart + input.pages.contactRevealDuration
  const contactStable = contactRevealEnd + input.pages.contactHoldDuration
  const projectsTitleStart = projectsStart + input.pages.projectsTitleDelay
  const projectsTitleEnd = projectsTitleStart + input.pages.projectsTitleDuration + ( input.pages.projectsTitleStagger * ( PROJECTS_TITLE_LINE_COUNT - 1 ) )
  const contactTitleStart = contactStart + input.pages.contactTitleDelay
  const contactTitleEnd = contactTitleStart + input.pages.contactTitleDuration + ( input.pages.contactTitleStagger * ( CONTACT_TITLE_LINE_COUNT - 1 ) )
  const contactItemsStart = contactStart + input.pages.contactItemsDelay
  const contactItemsEnd = contactItemsStart + input.pages.contactItemDuration + ( input.pages.contactItemStagger * ( CONTACT_ITEM_COUNT - 1 ) )
  // Resolve this timeline-unit threshold here so App.jsx never rebuilds a Draft 2 boundary.
  const draft2StudioStart = draft2TransitionReady + input.progressEpsilon * input.totalTimelineUnits
  const pageSchedule = {
    studioStart: draft2TransitionReady,
    draft2StudioStart,
    cinematicStudioStart: draft1TransitionReady,
    studioStable: 1,
    projectsStart,
    projectsStable: 2,
    projectsFadeStart: projectsStart + input.pages.projectsFadeDelay,
    projectsFadeEnd: projectsStart + input.pages.projectsFadeDelay + input.pages.projectsFadeDuration,
    projectsTitleStart,
    projectsTitleEnd,
    contactStart,
    contactRevealEnd,
    contactStable,
    contactFadeStart: contactStart + input.pages.contactFadeDelay,
    contactFadeEnd: contactStart + input.pages.contactFadeDelay + input.pages.contactFadeDuration,
    contactTitleStart,
    contactTitleEnd,
    contactItemsStart,
    contactItemsEnd,
    timelineEndStart: input.totalTimelineUnits - input.pages.timelineEndEpsilon,
  }

  const schedule = freeze( {
    ...input,
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
        transitionDurationProgress: draft1TransitionDuration / input.totalTimelineUnits,
        exitEnd: draft1ExitEnd,
        studioHandoff: draft1ExitEnd,
      } ),
      draft2: freeze( {
        approachEnd,
        impact,
        transitionReady: draft2TransitionReady,
        exitStart: draft2TransitionReady,
        transitionDuration: draft2TransitionDuration,
        transitionDurationProgress: draft2TransitionDuration / input.totalTimelineUnits,
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

export const toStoryProgress = ( timelineUnit ) =>
  assertProgress(
    finiteNonNegative( timelineUnit, 'timelineUnit' ) / STORY_TIMING.totalTimelineUnits,
    'storyProgress',
  )

// Convert normalized ScrollTrigger progress back to the GSAP timeline units used by draft controllers.
export const toTimelineUnits = ( storyProgress ) =>
  assertProgress( storyProgress, 'storyProgress' ) * STORY_TIMING.totalTimelineUnits
