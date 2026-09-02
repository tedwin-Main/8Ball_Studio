# Specification: Draft 1 2.5D/3D Background Parallax Integration

## Problem Statement

In Draft 1 (3D POV experience), cursor hover parallax is currently constrained by an architectural separation:
1. The background pool table is a static 2D image element in the DOM.
2. The 3D 8-ball, rack balls, and contact shadows are rendered inside an overlay WebGL canvas.
3. When pointer parallax moves the 3D camera, the 3D 8-ball shifts across the frozen 2D photo underneath, causing visual shearing, floatiness, and broken spatial cohesion.
4. Visitors expecting an immersive 3D POV break experience like Draft 2 lose the illusion of depth because the background environment remains completely flat and stationary.

## Solution

Transform Draft 1's background from a static 2D HTML plate into a 2.5D / 3D environment integrated directly within the Three.js WebGL scene:

1. **In-Engine 2.5D Projection Plane**:
   - Import the calibrated high-resolution table photo as a Three.js scene texture.
   - Project the background plate onto a 3D geometry inside the Three.js world, oriented along the calibrated table angle and perspective axis.
2. **Unified Single-Camera Parallax**:
   - Both the background table plate, contact shadows, and 3D balls render through the same perspective camera.
   - When the user moves their cursor, camera position and look-at target orbit in unified 3D space. The table, rails, ball rack, and foreground 8-ball shift with true optical perspective parallax.
3. **Differential Depth Scaling**:
   - The 8-ball sits prominently in the foreground with strong parallax response.
   - The table plate plane grounds the contact shadows with zero slip or shearing.
   - The background room/wall falls off with subtle distance damping, creating a rich multi-plane 2.5D depth illusion without needing a complete procedural 3D model rewrite.
4. **Performance and Clean Fallback**:
   - All rendering occurs inside a single WebGL canvas draw pass.
   - Touch devices and reduced-motion visitors receive the neutral, calibrated composition without unnecessary hover continuation loops.

## User Stories

1. As a site visitor viewing Draft 1 on desktop, I want the pool table background to tilt and shift with my cursor in perspective alongside the 8-ball, so that the entire scene feels like an interactive 3D world.
2. As a site visitor, I want the 8-ball and its contact shadow to stay permanently anchored to the felt texture during cursor hover, so that the ball never appears to float or slide across the table.
3. As a site visitor, I want the background table perspective to match the high-fidelity photographic aesthetics of Draft 1, so that visual richness is preserved without generic 3D graphics.
4. As a mobile visitor touching the screen, I want the scene to stay steady and centered on the calibrated composition without awkward jumps or drift.
5. As a visitor scrolling through the story break timeline, I want the 2.5D table plate and balls to animate smoothly into the scatter phase without frame drops or visual tearing.
6. As a visitor with reduced motion preferences (`prefers-reduced-motion: reduce`), I want the 2.5D plate to render in its default calibrated pose without continuous hover polling.

## Implementation Decisions

- **Architecture Migration**:
  Retire the external `<picture>` / `<img className="pool-pov-photo" />` DOM elements as the primary display layer. Move background rendering into the WebGL scene graph using a perspective-calibrated texture plane.
- **Scene Graph Organization**:
  - `tableRoot`: Contains the 2.5D table plate mesh, shadow plane group, cue/striker group, and rack ball meshes.
  - Background Mesh: A planar or subtly curved mesh mapped with the calibrated landscape/portrait photo texture, positioned at the calibrated table plane (`tablePlane.position`, `tablePlane.rotation`, `tablePlane.scale`).
- **Camera Framing Contract**:
  - Maintain compatibility with `resolveIntroCameraFraming` while lifting pointer camera translation limits.
  - Apply pointer parallax to the unified camera so the 3D ball and 2.5D table plate maintain an exact physical tangent at the contact point.
- **Texture Management**:
  - Load and manage the background texture through Three.js texture loaders with `SRGBColorSpace`, linear mipmap filtering, and anisotropic filtering up to the device budget.
  - Ensure all textures and materials are tracked in disposable sets for clean unmount.
- **Lighting and Shading**:
  - Use `MeshBasicMaterial` or subtle `MeshStandardMaterial` for the plate to preserve the photo's baked lighting while allowing Three.js directional spotlights to cast specular glints and shadows across the cloth.

## Testing Decisions

- Test that fine-pointer hover updates the unified camera without decoupling ball coordinates from table plane coordinates.
- Test that mobile and touch inputs keep pointer offsets at neutral zero.
- Test that aspect ratio changes (landscape vs portrait) switch between orientation textures without memory leaks or render stalling.
- Test that `PoolPovDraft` unmount cleanly disposes all WebGL textures, geometries, and frame schedulers.
- Verify full build passes with `npm run build && node --test src/drafts/*.test.js`.

## Out of Scope

- Building a full procedural 3D table mesh for Draft 1 (that is already the domain of Draft 2).
- Modifying break physics simulation algorithms or rack scatter paths.
- Altering the global story scroll triggers or GSAP animation timelines outside Draft 1.

## Further Notes

This approach unites the visual realism of Draft 1's photograph with the dynamic interactive depth of Draft 2's WebGL camera.
