# Fix pagination alignment

## Problem

Pagination targets hidden DOM marker tops, while GSAP ScrollTrigger maps progress across `story.offsetHeight - window.innerHeight`. These measurements can diverge. The Studio title transition can therefore appear between the Intro and Studio pagination positions.

## Implementation steps

1. Make `STORY_PAGES[].progress` the single source of truth for page position.
2. Pass complete page definitions, including normalized progress, into `useStoryPager`.
3. Calculate each pagination target from the exact ScrollTrigger scroll range:
   `storyTop + (storyHeight - viewportHeight) * page.targetProgress`.
4. Keep two explicit normalized values when a scene transitions before its stable landing:
   - `startProgress` changes the active pagination dot when that scene first becomes visible.
   - `targetProgress` lands clicks on the scene's stable completed state.
5. Match `startProgress` to the current GSAP entry positions: Studio `0.78 / 3`, Projects `1.16 / 3`, Contact `2.14 / 3`.
6. Keep stable click targets at Studio `1 / 3`, Projects `2 / 3`, Contact `1`.
7. Remove hidden marker geometry only if it is no longer needed. Do not alter visual layout or marquee timing.
8. Keep Lenis navigation, keyboard controls, reduced-motion behavior, and mobile viewport resizing working.
9. Add short plain-English inline comments for scene starts, stable targets, and target calculation.

## Acceptance criteria

- The Studio dot becomes active when the Studio screen starts at timeline unit `0.78`, not later at unit `1`.
- Clicking Studio lands at timeline progress `1 / 3`, where the complete 8 Ball Studio title is visible.
- Clicking Projects lands at timeline progress `2 / 3`.
- Clicking Contact lands at timeline progress `1`.
- Active pagination changes at the same normalized thresholds used by navigation.
- Desktop and mobile use the same formula; no `svh` marker rounding mismatch remains.
- No pagination snap loop, forced wheel interception, marquee speed change, commit, or push.
- Do not run automated tests or verification commands.

## Allowed code files

- `src/App.jsx`
- `src/hooks/useStoryPager.js`
- `src/styles.css` only if hidden marker CSS becomes unused
