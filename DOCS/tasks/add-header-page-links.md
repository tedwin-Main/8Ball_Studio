# Add header page links

## Goal

Add `Our Projects` and `Contact Us` links beside `Top` in the top-right header. Each link must navigate through the existing pager so it lands on the exact stable page target and keeps Lenis motion.

## Implementation steps

1. Convert the right-side header control wrapper into a semantic navigation element.
2. Add `Our Projects` and `Contact Us` anchor controls beside `Top`.
3. Prevent native anchor jumping and call `goToPage( 2 )` for Projects and `goToPage( 3 )` for Contact.
4. Keep `Top` calling `goToPage( 0 )` through `replay()`.
5. Reuse one shared header-link visual style for anchors and the Top button.
6. Keep all controls on one row on desktop and mobile without overlapping the logo.
7. Preserve 44px mobile touch targets, keyboard focus styles, marquee timing, pagination timing, and Lenis settings.
8. Add short plain-English inline comments where navigation behavior is not obvious.

## Acceptance criteria

- `Our Projects` lands at the Projects stable target (`2 / 3`).
- `Contact Us` lands at the Contact stable target (`1`).
- `Top` still lands at Intro (`0`).
- Links remain visible and usable on narrow mobile screens.
- No commit, push, test, build, dev server, or automated verification.

## Allowed code files

- `src/App.jsx`
- `src/styles.css`
