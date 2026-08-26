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
    cueReady: 0.24,
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
  } ),
  pages: freeze( {
    // Studio occupies timeline unit 1; these are the readable holds before later pages.
    studioHold: 0.16,
    studioRevealDuration: 0.52,
    // Delay before the Studio title starts fading as Projects appears.
    projectsFadeDelay: 0.04,
    projectsFadeDuration: 0.46,
    projectsTitleDelay: 0.41,
    projectsHold: 0.14,
    // Contact reveal is measured from the Projects stable mark.
    contactRevealDuration: 0.56,
    contactFadeDelay: 0.04,
    contactFadeDuration: 0.5,
    contactTitleDelay: 0.38,
    contactItemsDelay: 0.53,
    // Keeps the GSAP timeline exactly as long as the configured story.
    timelineEndEpsilon: 0.01,
  } ),
} )

const merge = ( overrides = {} ) => ( {
  ...STORY_TIMING_DEFAULTS,
  ...overrides,
  scroll: { ...STORY_TIMING_DEFAULTS.scroll, ...overrides.scroll },
  intro: { ...STORY_TIMING_DEFAULTS.intro, ...overrides.intro },
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

  const milestones = [
    schedule.pages.studioStart,
    schedule.pages.cinematicStudioStart,
    schedule.pages.projectsStart,
    schedule.pages.contactStart,
    schedule.pages.contactStable,
  ]
  if ( milestones.some( ( value ) => value > schedule.totalTimelineUnits ) )
  {
    throw new RangeError( 'page schedule must fit inside totalTimelineUnits.' )
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
    finiteNonNegative( value, `intro.${name}` )
  } )

  Object.entries( input.pages ).forEach( ( [ name, value ] ) =>
  {
    finiteNonNegative( value, `pages.${name}` )
  } )

  const cueReady = assertProgress( input.intro.cueReady, 'intro.cueReady' )
  const approachEnd = assertProgress( input.intro.approachDuration, 'intro.approachDuration' )
  const impact = approachEnd
  const draft1TransitionReady = assertProgress(
    approachEnd + input.intro.draft1ScatterDuration,
    'intro.draft1 scatter end',
  )
  const draft1ExitEnd = assertProgress(
    draft1TransitionReady + input.intro.draft1TransitionDuration,
    'intro.draft1 transition end',
  )
  const draft2TransitionReady = assertProgress(
    approachEnd + input.intro.draft2ScatterDuration,
    'intro.draft2 scatter end',
  )
  const draft2ExitEnd = assertProgress(
    draft2TransitionReady + input.intro.draft2TransitionDuration,
    'intro.draft2 transition end',
  )
  const draft2PocketCut = finiteNonNegative(
    draft2TransitionReady - input.intro.draft2PocketCutLead,
    'intro.draft2 pocket cut',
  )
  if ( cueReady > approachEnd )
  {
    throw new RangeError( 'intro.cueReady must occur before impact.' )
  }
  const cueRelease = assertProgress(
    cueReady + input.intro.cueReleaseEpsilon,
    'cue.release',
  )
  const projectsStart = 1 + finiteNonNegative( input.pages.studioHold, 'pages.studioHold' )
  // Each later page owns one full timeline unit; holds are measured from that page's stable mark.
  const contactStart = 2 + finiteNonNegative( input.pages.projectsHold, 'pages.projectsHold' )
  const pageSchedule = {
    studioStart: draft2TransitionReady,
    cinematicStudioStart: draft1TransitionReady,
    studioStable: 1,
    projectsStart,
    projectsStable: 2,
    contactStart,
    contactStable: input.totalTimelineUnits,
  }

  const schedule = freeze( {
    ...input,
    cue: freeze( {
      ready: cueReady,
      release: cueRelease,
    } ),
    intro: freeze( {
      ...input.intro,
      approachEnd,
      impact,
      draft1: freeze( {
        approachEnd,
        impact,
        transitionReady: draft1TransitionReady,
        exitStart: draft1TransitionReady,
        exitEnd: draft1ExitEnd,
        studioHandoff: draft1ExitEnd,
      } ),
      draft2: freeze( {
        approachEnd,
        impact,
        transitionReady: draft2TransitionReady,
        exitStart: draft2TransitionReady,
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
