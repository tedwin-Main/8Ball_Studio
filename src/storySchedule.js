import { STORY_TIMING, toStoryProgress } from './storyTiming.js'

// Helper function to create an immutable page object.
function createPage( id, label, startProgress, targetProgress )
{
  return Object.freeze( {
    id: id,
    label: label,
    startProgress: startProgress,
    targetProgress: targetProgress,
  } )
}

// Check if draft uses 3D break physics.
function is3dBreakDraft( draftId )
{
  if ( draftId === 'webgl' || draftId === 'photoreal' )
  {
    return true
  }
  return false
}

// Timeline unit where Studio takes over from the Intro for this draft.
export function getStudioStartUnits( draftId = 'cinematic' )
{
  // Choose studio start milestone based on draft physics.
  if ( is3dBreakDraft( draftId ) )
  {
    return STORY_TIMING.pages.draft2StudioStart
  }
  return STORY_TIMING.pages.cinematicStudioStart
}

// Screens of horizontal run assumed for Projects before the real track is measured (App.jsx
// measures the layout on mount, on every ScrollTrigger refresh, and on resize).
const DEFAULT_RUN_SCREENS = 1

// Where the Story's parts sit in the document, in one length unit (px in the browser).
// The pinned stage scrolls through the Intro → Studio cue over pinnedRange. Projects is pulled up by
// pages.handoffScreens so it rises over the held Studio, which puts its top exactly where the stage
// releases; it is one screen plus its horizontal run tall. Contact follows it and ends the page.
// The default is measured in screens.
export function getDefaultStoryLayout()
{
  const pinnedRange = STORY_TIMING.totalTimelineUnits * STORY_TIMING.scroll.viewportsPerUnit
  const projectsTop = pinnedRange + 1 - STORY_TIMING.pages.handoffScreens
  const contactTop = projectsTop + 1 + DEFAULT_RUN_SCREENS
  return Object.freeze( {
    viewport: 1,
    pinnedRange,
    projectsTop,
    contactTop,
    documentRange: contactTop,
  } )
}

function assertLayout( layout )
{
  const keys = [ 'viewport', 'pinnedRange', 'projectsTop', 'contactTop', 'documentRange' ]
  keys.forEach( ( key ) =>
  {
    if ( !Number.isFinite( layout?.[ key ] ) || layout[ key ] < 0 )
    {
      throw new RangeError( `Story layout ${key} must be a finite, non-negative number.` )
    }
  } )
  if ( layout.documentRange <= 0 ) throw new RangeError( 'Story layout documentRange must be greater than zero.' )
  if ( layout.projectsTop < layout.pinnedRange || layout.contactTop < layout.projectsTop )
  {
    throw new RangeError( 'Story sections must follow the pinned stage in order.' )
  }
}

// Return the Story pages for the given draft. Progress is a share of the whole document's scroll
// range, which is what Story navigation measures: Intro and Studio sit inside the pinned stage,
// Projects and Contact land on their section tops.
export function getStoryPages( draftId = 'cinematic', layout = getDefaultStoryLayout() )
{
  assertLayout( layout )
  const { viewport, pinnedRange, projectsTop, contactTop, documentRange } = layout
  const share = ( y ) => Math.min( 1, Math.max( 0, y / documentRange ) )
  // A pinned-stage timeline unit as a share of the document.
  const pinned = ( units ) => share( toStoryProgress( units ) * pinnedRange )
  // A section becomes the current Page once it covers the lower half of the viewport.
  const sectionStart = ( top ) => share( top - viewport / 2 )

  const pages = [
    createPage( 'intro', 'Intro', 0, 0 ),
    createPage( 'studio', 'Studio', pinned( getStudioStartUnits( draftId ) ), pinned( STORY_TIMING.pages.studioStable ) ),
    createPage( 'projects', 'Projects', sectionStart( projectsTop ), share( projectsTop ) ),
    // The page cannot scroll past its end, so Contact lands there when its section is short.
    createPage( 'contact', 'Contact', sectionStart( contactTop ), share( Math.min( contactTop, documentRange ) ) ),
  ]

  return Object.freeze( pages )
}
