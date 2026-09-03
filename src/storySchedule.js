import { STORY_TIMING, toStoryProgress } from './storyTiming.js'

// Page facts live with the resolved Story schedule so movement code does not rebuild them.
const createPage = ( id, label, start, target ) => Object.freeze( {
  id,
  label,
  startProgress: toStoryProgress( start ),
  targetProgress: toStoryProgress( target ),
} )

// Drafts 2 and 4 (photoreal) reach Studio on the measured 3D Break handoff; Drafts 1 and 3 use the cinematic threshold.
const is3dBreakDraft = ( id ) => id === 'webgl' || id === 'photoreal'

export const getStoryPages = ( draftId = 'cinematic' ) =>
  Object.freeze( [
    createPage( 'intro', 'Intro', 0, 0 ),
    createPage(
      'studio',
      'Studio',
      is3dBreakDraft( draftId ) ? STORY_TIMING.pages.draft2StudioStart : STORY_TIMING.pages.cinematicStudioStart,
      STORY_TIMING.pages.studioStable,
    ),
    createPage( 'projects', 'Projects', STORY_TIMING.pages.projectsStart, STORY_TIMING.pages.projectsStable ),
    createPage( 'contact', 'Contact', STORY_TIMING.pages.contactStart, STORY_TIMING.pages.contactStable ),
  ] )
