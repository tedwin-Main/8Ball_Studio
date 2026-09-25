import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { STORY_TIMING } from '../storyTiming.js'
import { easeThemeMorph, getRunDistance, getRunScrollTarget, liftAt, sectionAt, themeProgressAt } from './flowMath.js'

gsap.registerPlugin( ScrollTrigger )

// A section takes over the header (its ink, the browser chrome colour) once its top passes this line.
const HEADER_LINE_PX = 64

/**
 * Tracks which part of the Story sits under the header: the pinned stage, Projects, or Contact.
 * Runs in every motion mode (reduced motion too), because the header's ink and the browser chrome
 * colour must follow the section even when nothing animates. Returns a cleanup.
 */
export function createNavSections ( { root, onNavSection } )
{
  const projects = root.querySelector( '.projects-screen' )
  const contact = root.querySelector( '.contact-screen' )
  if ( !projects || !contact ) return () => {}

  const starts = { projectsStart: Infinity, contactStart: Infinity }
  let current = null
  const sync = ( self ) =>
  {
    const next = sectionAt( self.scroll(), starts )
    if ( next === current ) return
    current = next
    onNavSection?.( next )
  }

  // One trigger from Projects reaching the header line to Contact reaching it. Every edge callback
  // re-reads the scroll position, so a jump straight past both sections still lands on the right one.
  const trigger = ScrollTrigger.create( {
    trigger: projects,
    start: `top top+=${HEADER_LINE_PX}`,
    endTrigger: contact,
    end: `top top+=${HEADER_LINE_PX}`,
    onRefresh: ( self ) =>
    {
      starts.projectsStart = self.start
      starts.contactStart = self.end
      sync( self )
    },
    onUpdate: sync,
    onEnter: sync,
    onLeave: sync,
    onEnterBack: sync,
    onLeaveBack: sync,
  } )

  return () =>
  {
    trigger.kill()
    onNavSection?.( 'stage' )
  }
}

/**
 * The section choreography after the pinned stage, shared by every look:
 * 1. Studio → Projects: Projects rises over the held Studio, which shrinks back and dims.
 * 2. The Projects run: the section pins while its track of boards slides sideways, each board
 *    lifting (--lift) as it crosses the centre; the title drifts and the wall pushes in for depth.
 * 3. Projects → Contact: Projects scrolls away and Contact is uncovered from beneath it.
 * 4. Titles are set with the look's own letter entrance; Contact's rows settle in.
 * 5. Looks with section themes (Acid Night) get one scroll-driven palette position, --theme-t.
 *
 * Call it inside the Story's gsap.context / matchMedia callback: every tween and ScrollTrigger made
 * here is reverted with it. The returned cleanup undoes what GSAP cannot (listeners, custom props).
 */
export function createFlowMotion ( { root, motion, charRest, sectionThemes, compact, scrub, scrollToY } )
{
  const flow = STORY_TIMING.flow
  const projects = root.querySelector( '.projects-screen' )
  const contact = root.querySelector( '.contact-screen' )
  const track = projects?.querySelector( '.projects-track' )
  const rail = projects?.querySelector( '.projects-rail' )
  if ( !projects || !contact || !track || !rail ) return () => {}

  const titleScreen = root.querySelector( '.title-screen' )
  const stageBackdrop = root.querySelector( '.stage-backdrop' )
  const stageShade = root.querySelector( '.stage-shade' )
  const projectsContent = projects.querySelector( '.projects-content' )
  const projectsDepth = projects.querySelectorAll( ':scope .projects-sticky > .cyc-wall, :scope .projects-sticky > .look-scenery' )
  const contactInner = contact.querySelector( '.contact-inner' )
  const contactShade = contact.querySelector( '.contact-shade' )
  const cleanups = []
  // Phones travel shorter: the same moves at a little over half the distance.
  const reach = compact ? 0.6 : 1

  // ---- The run's length: measured before every refresh, so Projects is tall enough to pin it. ----
  let runDistance = 0
  const parts = { handoff: 1, run: 0, reveal: 1 }
  const measure = () =>
  {
    runDistance = getRunDistance( track.scrollWidth, rail.clientWidth )
    projects.style.setProperty( '--run-distance', `${runDistance}px` )
    parts.handoff = window.innerHeight
    parts.run = runDistance
    parts.reveal = window.innerHeight
  }
  measure()
  ScrollTrigger.addEventListener( 'refreshInit', measure )
  cleanups.push( () =>
  {
    ScrollTrigger.removeEventListener( 'refreshInit', measure )
    projects.style.removeProperty( '--run-distance' )
  } )

  // ---- 1. Studio → Projects: rise over, shrink back. ----
  // The backdrop fills the stage behind the shrinking Studio with the look's hall colour, so the
  // frozen Intro scene never shows around its edges.
  gsap.timeline( {
    scrollTrigger: { trigger: projects, start: 'top bottom', end: 'top top', scrub, invalidateOnRefresh: true },
  } )
    .fromTo( stageBackdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001, ease: 'none' }, 0 )
    .fromTo( titleScreen, { scale: 1, yPercent: 0 }, {
      scale: flow.shrinkScale,
      yPercent: -flow.shrinkLiftPercent,
      duration: 1,
      ease: 'none',
    }, 0 )
    .fromTo( stageShade, { opacity: 0 }, { opacity: flow.shrinkDim, duration: 1, ease: 'none' }, 0 )
    // Projects' content arrives a little behind its surface, then catches up: the rise.
    .fromTo( [ projectsContent, rail ], { y: () => window.innerHeight * flow.riseVh * reach / 100 }, {
      y: 0,
      duration: 1,
      ease: 'power2.out',
    }, 0 )

  // ---- 2. The Projects run. ----
  const runTrigger = () => ( {
    trigger: projects,
    start: 'top top',
    end: () => `+=${Math.max( 1, runDistance )}`,
    scrub,
    invalidateOnRefresh: true,
  } )
  const run = gsap.to( track, { x: () => -runDistance, ease: 'none', scrollTrigger: runTrigger() } )
  // Depth: the title drifts against the boards, and the wall (or table) pushes in slightly.
  gsap.to( projectsContent, { x: () => -window.innerWidth * 0.04 * reach, ease: 'none', scrollTrigger: runTrigger() } )
  if ( projectsDepth.length ) gsap.fromTo( projectsDepth, { scale: 1 }, { scale: 1.04, ease: 'none', scrollTrigger: runTrigger() } )

  // Each board lifts as it crosses the centre; every look turns --lift into its own gesture.
  gsap.utils.toArray( '.project-card', track ).forEach( ( card ) =>
  {
    const setLift = ( self ) => card.style.setProperty( '--lift', liftAt( self.progress ).toFixed( 3 ) )
    ScrollTrigger.create( {
      trigger: card,
      containerAnimation: run,
      start: 'left right',
      end: 'right left',
      onUpdate: setLift,
      onRefresh: setLift,
    } )
    cleanups.push( () => card.style.removeProperty( '--lift' ) )
  } )

  // Keyboard focus on a board link glides the run until that board sits at the centre.
  const followFocus = ( event ) =>
  {
    const card = event.target.closest?.( '.project-card' )
    const start = run.scrollTrigger?.start
    if ( !card || !Number.isFinite( start ) || !( runDistance > 0 ) ) return
    scrollToY?.( getRunScrollTarget( {
      sectionTop: start,
      runDistance,
      boardLeft: card.offsetLeft,
      boardWidth: card.offsetWidth,
      viewportWidth: rail.clientWidth,
    } ) )
  }
  track.addEventListener( 'focusin', followFocus )
  cleanups.push( () => track.removeEventListener( 'focusin', followFocus ) )

  // ---- 3. Projects → Contact: uncovered from beneath. ----
  gsap.timeline( {
    scrollTrigger: { trigger: contact, start: 'top bottom', end: 'top top', scrub, invalidateOnRefresh: true },
  } )
    .fromTo( contactInner, { yPercent: -flow.contactRevealOffsetPercent * reach }, { yPercent: 0, duration: 1, ease: 'none' }, 0 )
    .fromTo( contactShade, { opacity: flow.contactShade }, { opacity: 0, duration: 1, ease: 'none' }, 0 )

  // ---- 4. Titles in the look's own entrance, and Contact's rows settling in. ----
  // Rows fade with opacity, never visibility, so their links stay reachable by keyboard.
  const revealTitle = ( section, selector, start, end ) =>
  {
    const letters = section.querySelectorAll( selector )
    if ( !letters.length ) return
    gsap.fromTo( letters, motion.entrance, {
      ...charRest,
      stagger: { amount: 0.3, from: motion.letterFrom ?? 'end' },
      scrollTrigger: { trigger: section, start, end, scrub },
    } )
  }
  revealTitle( projects, '.projects-title .cue-char', 'top 80%', 'top 15%' )
  revealTitle( contact, '.contact-title .cue-char', 'top 75%', 'top 10%' )

  const rows = contact.querySelectorAll( '.contact-list li, .call-sheet-foot' )
  if ( rows.length )
  {
    gsap.fromTo( rows, { y: 20, opacity: 0 }, {
      y: 0,
      opacity: 1,
      ease: 'power2.out',
      stagger: 0.12,
      scrollTrigger: { trigger: contact, start: 'top 60%', end: 'top 5%', scrub },
    } )
  }

  // ---- 5. Section themes: one palette position from Projects entering to Contact settling. ----
  // 0 = Studio's palette, 1 = Projects', 2 = Contact's; the look's CSS mixes its colours from it.
  if ( sectionThemes )
  {
    const theme = { t: 0 }
    // Set on the two walls, the only surfaces that paint with it, so a change re-styles two leaf
    // elements instead of both sections' whole subtrees on every scrolled frame.
    const surfaces = [ projects, contact ].map( ( section ) => section.querySelector( '.cyc-wall' ) ).filter( Boolean )
    const applyTheme = () => surfaces.forEach( ( surface ) => surface.style.setProperty( '--theme-t', theme.t.toFixed( 4 ) ) )
    gsap.to( theme, {
      t: 2,
      // The tween runs 0 → 2 over the whole stretch; this ease holds it at 1 through the run and
      // makes each palette change inside a short window of its handoff (easeThemeMorph).
      ease: ( progress ) => easeThemeMorph( themeProgressAt( progress, parts ) ) / 2,
      onUpdate: applyTheme,
      scrollTrigger: {
        trigger: projects,
        start: 'top bottom',
        endTrigger: contact,
        end: 'top top',
        scrub,
        invalidateOnRefresh: true,
      },
    } )
    applyTheme()
    cleanups.push( () => surfaces.forEach( ( surface ) => surface.style.removeProperty( '--theme-t' ) ) )
  }

  return () => cleanups.forEach( ( cleanup ) => cleanup() )
}
