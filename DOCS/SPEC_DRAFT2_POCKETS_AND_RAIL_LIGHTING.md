# Specification: Draft 2 Pool Table Pocket Visibility & Far Rail Illumination

## Problem Statement

In Draft 2 (WebGL 3D Break experience), two visual issues occur:
1. **Pocket Voids**: All six pocket apertures appear as solid, pitch-black cutouts ("black holes") with zero visible depth, liner texture, or collar bevel highlights.
2. **Obscured Far Rail**: The table rail and cushion behind the 15-ball rack (at the far end, Z ≈ -10) are engulfed in complete darkness, severing the visual continuity of the table frame.

## Solution

1. **PBR Pocket Materials**:
   - Upgrade pocket collar brackets from flat black matte to metallic bronze/nickel (`#524b42`, `metalness: 0.65`, `roughness: 0.28`, `clearcoat: 0.55`) so clear specular bevels trace the aperture rim.
   - Upgrade pocket cavity interior from pitch black (`#050505`) to dark saddle leather (`#25211c`, `roughness: 0.68`, `envMapIntensity: 0.35`) so light reveals the 3D depth of the pocket drop.
2. **Full-Length Overhead Area Light**:
   - Extend the primary overhead softbox (`RectAreaLight`) along the Z-axis from 14.8 to 21.2 units, providing uniform diffuse illumination across the entire playing surface from Z = -10.6 to +10.6.
3. **Dedicated Far Rail Key/Fill Light**:
   - Introduce an angled directional fill light targeted directly at the far cushion (Z = -9.68) to cut through ball rack shadows and illuminate the green cushion cloth and diamond sights.
4. **Atmospheric Fog Relaxation**:
   - Adjust `FogExp2` density from `0.018` to `0.009` and tune fog color to match the studio environment, preventing distance extinction from crushing the far end of the table.

## User Stories

1. As a site visitor viewing Draft 2, I want to clearly see the pocket openings with metallic bevel highlights, so that the pockets look like realistic pool table hardware rather than flat black holes.
2. As a site visitor viewing Draft 2, I want to see the recessed depth and interior liner of each pocket, so that balls sinking into pockets feel grounded in physical space.
3. As a site visitor viewing Draft 2, I want the far green cushion behind the ball rack to be evenly illuminated, so that the table has a clear, premium boundary.
4. As a site visitor, I want the tournament cloth color and velvet sheen to remain consistent between the near striker area and the far rack area, so that the table surface feels unified.
5. As a site visitor with reduced motion or on mobile devices, I want the lighting and material adjustments to run within the established 60fps render budget without adding shader overhead.

## Implementation Decisions

- **Pocket Casting Material**:
  Use `MeshPhysicalMaterial` for the torus collars with high metalness (`0.65`), moderate roughness (`0.28`), and clearcoat (`0.55`) to catch the studio overhead softbox.
- **Pocket Cavity Lining**:
  Retain the 8.5-unit cylinder depth while giving `pocketInteriorMaterial` and `pocketBottomMaterial` a dark leather albedo and environmental reflection response (`envMapIntensity: 0.35`).
- **Lighting Rig Dimensions**:
  Set `overheadRectLight` dimensions to 8.5 units wide by 21.2 units long at Y = 7.0, covering the complete regulation table apron.
- **Far Cushion Direct Light**:
  Position a directional fill light at `[0, 6.2, -12.8]` with target `[0, 0.48, -9.68]`, intensity `0.95`, and tint `#dcf2e4`.
- **Fog Attenuation**:
  Set exponential fog density to `0.009` with color `#090d0b` to retain atmospheric room falloff without extinguishing table geometry.

## Testing Decisions

- Only test external behavior and visual correctness; do not test private scene variables.
- Verify unit tests pass via `node --test src/drafts/*.test.js` to confirm camera framing and simulation timings remain intact.
- Verify production build succeeds via `npm run build`.

## Out of Scope

- Modifying the photo-based Draft 1 table plate.
- Modifying physics collision matrices or ball trajectory milestones.
- Adding interactive pocket drop animations outside the existing deterministic timeline.

## Further Notes

All changes maintain consistency with the anti-slop visual standards and PBR studio lighting conventions established in Draft 2.
