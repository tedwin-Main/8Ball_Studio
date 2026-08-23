# 8 Ball Studio Intro Redesign Plan

Status: implemented and verified on 2026-08-10. Semi-2.5D ball revision added.

## Goal

Keep the three numbered draft buttons while removing only the separate `Draft` label. Make Draft 1 a lightweight, realistic 2.5D pool-room scene. Rebuild Draft 2 as a modern Three.js/GSAP-style pool-table interaction with real pocket openings and a two-scroll cue sequence. Preserve Draft 3.

## Implementation

1. Documentation and draft controls.
   - Keep `?draft=cinematic`, `?draft=webgl`, and `?draft=original`.
   - Keep buttons `01 3D POV`, `02 3D Break`, and `03 Original`.
   - Remove only the switcher label that says `Draft`.
   - Keep Draft 1 as the default and make Draft 2 fall back to Draft 1 if WebGL fails.

2. Draft 1: 2.5D.
   - Replace its WebGL wrapper with a DOM controller using the existing portrait and landscape pool-room PNGs.
   - Use `<picture>` for orientation-specific loading.
   - Layer the 8-ball logo as a foreground sphere with CSS light falloff, highlight, depth blur, color grade, and contact shadow.
   - Scrub background push/focus, ball roll and scale, impact compression, and the Studio transition from normalized progress.
   - Do not show a cue in Draft 1.

3. Draft 2: semi-2.5D.
   - Keep the table, rack, pockets, rails, lighting, SSAO, and cue in Three.js.
   - Replace the visible 3D logo sphere with a DOM 2D logo ball and contact shadow.
   - Roll the 2D ball straight toward the rack while the 3D rack still scatters on impact.
   - Keep the hidden sphere geometry only as an internal fallback asset; it is not rendered.
   - Build the felt as geometry with six circular holes; use recessed pocket cups below the felt.
   - Segment rails and cushions around pocket mouths. Remove the current visible pocket-cover cylinders/rings.
   - Use rounded wood rails, PBR felt/wood/ball materials, environment reflections, soft key/fill/rim lighting, directional shadows, and SSAO contact shading.
   - Keep high-resolution numbered/striped rack balls and the existing curved decal geometry as a non-visible fallback.
   - Add subtle pointer camera parallax, restrained editorial status text, camera kick, and deterministic rack scatter. No bloom, particles, or generic glow.

4. Draft 2 cue sequence.
   - Add a real Three.js cue group with shaft, ferrule, chalk tip, grip, and rings.
   - First forward gesture: cue enters and settles into aim; Lenis stops at local progress `0.52`.
   - Second forward gesture: cue strikes, logo ball rolls into the rack, rack scatters, camera recovers, then transition to Studio.
   - Reverse scroll restores the cue, ball, rack, and first-scroll checkpoint.
   - Apply the cue checkpoint only while Draft 2 is active.

5. Forward rolling.
   - Draft 1 and Draft 2 keep the outer 2D ball circular throughout travel.
   - The vector logo mark moves over the front hemisphere, compresses at each pole, and hides on the rear hemisphere.
   - Do not use `rotateX` card flipping or screen-plane `rotateZ` spinning for forward travel.

## Verification

- `npm run build` passes. Vite reports only the existing large-chunk warning from Three.js and raster assets.
- `git diff --check` passes.
- Browser QA passes for Draft 1 and Draft 2 at 1440×900 and 390×844.
- Draft switching preserves the current story position without a page reload.
- Draft 2 first gesture stops at the cue checkpoint; the next gesture strikes and scatters the rack; reverse input returns to the checkpoint.
- Draft 2 runtime console has zero errors and zero warnings during the tested flows.
- Do not commit or push.

## Constraints

- Preserve Draft 3 behavior.
- Preserve unrelated user changes, including `DOCS/TODOLIST.txt`.
- Add plain-English inline comments for major features, configuration, and key API calls.
