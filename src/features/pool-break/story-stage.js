// The pinned stage's fixed choreography, in timeline units: the Intro break runs 0 → 1 (Studio is lit
// at 1), Studio holds, then Services rises over it. Not settings: the dials are in src/storyTiming.js.

import { clamp } from '../../common/utils/math-helpers.js'

const freeze = ( value ) => Object.freeze( value )

const VIEWPORTS_PER_UNIT = 3
// Where the 8-ball hits the rack. 0 → APPROACH_END is the roll, so raising it lengthens the roll's scroll.
// .break's height in scroll-distance.css (--scroll-break) is the whole run, so the roll and scatter scale with it.
const APPROACH_END = 0.28
const SCATTER = 0.22
const EXIT = 0.16
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
    studioCue: freeze( {
      duration: STUDIO_CUE_SCREENS / VIEWPORTS_PER_UNIT,
      durationProgress: STUDIO_CUE_SCREENS / VIEWPORTS_PER_UNIT / totalTimelineUnits,
    } ),
  } ),
  pages: freeze( {
    studioStart: transitionReady,
    cinematicStudioStart: transitionReady,
    studioStable,
    handoffStart,
    handoffScreens: HANDOFF_SCREENS,
    releaseEnd,
    timelineEndStart: totalTimelineUnits - 0.01,
    timelineEndEpsilon: 0.01,
  } ),
} )

// The 8-ball's approach, weighted like a Lenis scroll push: quadratic ramp over the first ROLL_RAMP, then
// constant speed into the rack so it hits with momentum. Pieces meet at equal speed, so no kink.
const ROLL_RAMP = 0.35
export function easeRollMomentum ( progress )
{
  const t = clamp( progress )
  if ( t < ROLL_RAMP ) return t * t / ( ROLL_RAMP * ( 2 - ROLL_RAMP ) )
  return ( 2 * t - ROLL_RAMP ) / ( 2 - ROLL_RAMP )
}
