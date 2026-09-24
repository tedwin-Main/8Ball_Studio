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

// Where the Story's parts sit in the document, in one length unit (px in the browser).
// The pinned stage scrolls through the Intro → Studio cue over pinnedRange; after that Studio,
// Projects, and Contact are normal sections. The default assumes one-screen sections, measured in
// screens: the stage is pinnedRange + 1 screens tall, and each section follows it.
export function getDefaultStoryLayout()
{
  const pinnedRange = STORY_TIMING.totalTimelineUnits * STORY_TIMING.scroll.viewportsPerUnit
  return Object.freeze( {
    viewport: 1,
    pinnedRange,
    projectsTop: pinnedRange + 1,
    contactTop: pinnedRange + 2,
    documentRange: pinnedRange + 2,
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
