// The pinned stage's fixed choreography, in timeline units: the Intro break runs 0 → 1 (Studio is lit
// at 1), Studio holds, then Projects rises over it. Not settings: the dials are in src/storyTiming.js.

const freeze = ( value ) => Object.freeze( value )
const clamp = ( value ) => Math.min( 1, Math.max( 0, value ) )

const VIEWPORTS_PER_UNIT = 3
const APPROACH_END = 0.28
const SCATTER = 0.22
const EXIT = 0.16
const POCKET_CUT_LEAD = 0.04
const STUDIO_CUE_SCREENS = 1
const STUDIO_HOLD = 0.17
const HANDOFF_SCREENS = 1

const transitionReady = APPROACH_END + SCATTER
const studioStable = 1
const handoffStart = studioStable + STUDIO_HOLD
const releaseEnd = handoffStart + HANDOFF_SCREENS / VIEWPORTS_PER_UNIT
const totalTimelineUnits = releaseEnd

const draft = ( extra = {} ) => freeze( {
  approachEnd: APPROACH_END,
  impact: APPROACH_END,
  transitionReady,
  exitStart: transitionReady,
  transitionDuration: EXIT,
  transitionDurationProgress: EXIT / totalTimelineUnits,
  exitEnd: transitionReady + EXIT,
  studioHandoff: transitionReady + EXIT,
  ...extra,
} )

export const STAGE = freeze( {
  viewportsPerUnit: VIEWPORTS_PER_UNIT,
  totalTimelineUnits,
  intro: freeze( {
    approachEnd: APPROACH_END,
    impact: APPROACH_END,
    draft1: draft(),
    draft2: draft( { pocketCut: transitionReady - POCKET_CUT_LEAD } ),
    studioCue: freeze( {
      duration: STUDIO_CUE_SCREENS / VIEWPORTS_PER_UNIT,
      durationProgress: STUDIO_CUE_SCREENS / VIEWPORTS_PER_UNIT / totalTimelineUnits,
    } ),
  } ),
  pages: freeze( {
    studioStart: transitionReady,
    cinematicStudioStart: transitionReady,
    // Draft 2 lights Studio a hair after its handoff starts, so the two never tie.
    draft2StudioStart: transitionReady + 0.0005 * totalTimelineUnits,
    studioStable,
    handoffStart,
    handoffScreens: HANDOFF_SCREENS,
    releaseEnd,
    timelineEndStart: totalTimelineUnits - 0.01,
    timelineEndEpsilon: 0.01,
  } ),
} )

// Timeline units ⇄ 0-1 progress through the pinned stage.
export const toStoryProgress = ( units ) => clamp( units / totalTimelineUnits )
export const toTimelineUnits = ( progress ) => clamp( progress ) * totalTimelineUnits

const smoothstep = ( t ) => t * t * ( 3 - 2 * t )

// The 8-ball's approach: mostly smooth-step (it resists, then builds up), blended 72% with linear.
export function easeWeightedProgress ( progress, weight = 0.72 )
{
  const t = clamp( progress )
  return t + ( smoothstep( t ) - t ) * clamp( weight )
}

// Page glides: smooth-step in and out.
export const easeStoryTransition = ( progress ) => smoothstep( clamp( progress ) )
