# Fix Artigusto logo fit

## Problem

Artigusto is a square logo asset, but its project item uses `type: 'photo'`. The `.is-photo` rule applies `object-fit: cover`, which crops the circular logo and pushes it against the card edges.

## Implementation steps

1. Remove the photo classification from the Artigusto project item.
2. Let Artigusto use the shared logo rule with `object-fit: contain` and centered placement.
3. Keep enough internal padding so the full circle and wordmark remain visible.
4. Remove `.project-card.is-photo img` only if no project item uses it afterward.
5. Do not change card dimensions, marquee speed, pagination, header navigation, or other assets.
6. Add a short plain-English inline comment explaining why Artigusto uses logo containment.

## Acceptance criteria

- Full Artigusto circular logo is visible.
- Image is centered horizontally and vertically.
- No edge cropping occurs on desktop or mobile.
- Caption remains readable.
- No commit, push, test, build, dev server, or automated verification.

## Allowed code files

- `src/App.jsx`
- `src/styles.css`
