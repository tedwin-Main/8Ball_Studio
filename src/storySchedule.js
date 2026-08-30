import { STORY_TIMING, toStoryProgress } from './storyTiming.js'

// Page facts live with the resolved Story schedule so movement code does not rebuild them.
const createPage = ( id, label, start, target ) => Object.freeze( {
  id,
  label,
  startProgress: toStoryProgress( start ),
  targetProgress: toStoryProgress( target ),
} )

// Draft 2 reaches Studio on its measured handoff; other Drafts use the cinematic threshold.
export const getStoryPages = ( draftId = 'cinematic' ) =>
  Object.freeze( [
    createPage( 'intro', 'Intro', 0, 0 ),
    createPage(
      'studio',
      'Studio',
      draftId === 'webgl' ? STORY_TIMING.pages.draft2StudioStart : STORY_TIMING.pages.cinematicStudioStart,
      STORY_TIMING.pages.studioStable,
    ),
    createPage( 'projects', 'Projects', STORY_TIMING.pages.projectsStart, STORY_TIMING.pages.projectsStable ),
    createPage( 'contact', 'Contact', STORY_TIMING.pages.contactStart, STORY_TIMING.pages.contactStable ),
  ] )
