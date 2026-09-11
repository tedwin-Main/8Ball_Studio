import { STORY_TIMING, toStoryProgress } from './storyTiming.js'

// Helper function to create an immutable page object.
function createPage( id, label, start, target )
{
  return Object.freeze( {
    id: id,
    label: label,
    startProgress: toStoryProgress( start ),
    targetProgress: toStoryProgress( target ),
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

// Return the list of story pages for the given draft.
export function getStoryPages( draftId = 'cinematic' )
{
  // Choose studio start milestone based on draft physics.
  let studioStart = STORY_TIMING.pages.cinematicStudioStart
  if ( is3dBreakDraft( draftId ) )
  {
    studioStart = STORY_TIMING.pages.draft2StudioStart
  }

  const pages = [
    createPage( 'intro', 'Intro', 0, 0 ),
    createPage( 'studio', 'Studio', studioStart, STORY_TIMING.pages.studioStable ),
    createPage( 'projects', 'Projects', STORY_TIMING.pages.projectsStart, STORY_TIMING.pages.projectsStable ),
    createPage( 'contact', 'Contact', STORY_TIMING.pages.contactStart, STORY_TIMING.pages.contactStable ),
  ]

  return Object.freeze( pages )
}
