# Major Bug Fixes

## Draft 2 (WebGL 3D) Overall Lighting Increase (04/09/2026, 11:26 AM)

### Problem

Draft 2 rendered slightly dim with muted midtones and suppressed specular gleam on the balls and table rails.

### Fix

- Raised `toneMappingExposure` from `0.95` to `1.15` in `WebglPoolDraft.jsx`.
- Raised `scene.environmentIntensity` from `0.48` to `0.68` for luminous ambient fill and reflections.
- Boosted cloth `feltMaterial` sheen from `0.34` to `0.44` and `envMapIntensity` from `0.20` to `0.28`.
- Scaled studio lighting rig: `overheadRectLight` to `2.75`, `keyLight` to `1.85`, `leftChamferFill` to `0.45`, `rightChamferFill` to `0.42`, `farRailFill` to `1.25`, `overheadSpot` to `5.5`, `feltBounce` to `0.48`, and `rimLight` to `0.68`.

### Files Changed

- [src/drafts/WebglPoolDraft.jsx](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/WebglPoolDraft.jsx)
  - Modified — increased `toneMappingExposure`, `environmentIntensity`, cloth sheen, and studio light intensities.

## Draft 4 (Photoreal 3D) Overall Lighting Reduction (04/09/2026, 11:25 AM)

### Problem

Draft 4 rendered over-exposed with blown out specular highlights and washed-out felt colors due to high tone mapping exposure (`1.18`), elevated environment reflection intensity (`0.76`), and strong light intensities (`overheadRectLight: 2.85`, `keyLight: 1.85-2.1`, `overheadSpot: 5.8`).

### Fix

- Reduced `toneMappingExposure` from `1.18` to `0.92` in `PhotorealPoolDraft.jsx`.
- Reduced `scene.environmentIntensity` from `0.76` to `0.45` for controlled reflections.
- Scaled studio lighting rig: `overheadRectLight` to `1.85`, `keyLight` to `1.25`, `leftChamferFill` to `0.28`, `rightChamferFill` to `0.25`, `overheadSpot` to `3.6`, `feltBounce` to `0.35`, and `rimLight` to `0.48`.
- Synchronized GSAP choreography proxy in `photorealTimeline.js`: base `keyIntensity` set to `1.25`, establish accent eased to `1.45`.

### Files Changed

- [src/drafts/PhotorealPoolDraft.jsx](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/PhotorealPoolDraft.jsx)
  - Modified — lowered `toneMappingExposure` to `0.92`, `environmentIntensity` to `0.45`, and studio light values.
- [src/drafts/photorealTimeline.js](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/photorealTimeline.js)
  - Modified — tuned timeline key light animation range (`1.25` - `1.45`).

## Blank Screen Crash in WebglClassicDraft and PhotorealPoolDraft (03/09/2026, 09:30 PM)

### Problem

Loading the application produced a blank black screen. The browser console reported `Uncaught TypeError: A requestAnimationFrame function is required` at `demandFrameScheduler.js:21` originating from `<WebglClassicDraft>` and `<PhotorealPoolDraft>` during component layout effects.

### Fix

- Added window fallback defaults and `renderFrame` / `requestRender` compatibility aliases to `demandFrameScheduler.js`.
- Corrected scheduler and pointer initialization in `WebglClassicDraft.jsx` and `PhotorealPoolDraft.jsx` to supply explicit animation frame delegates, bind `pointer.advance()`, and pass camera framing outputs into Three.js camera position/target.
- Imported `STORY_TIMING` in `PhotorealPoolDraft.jsx` for camera framing progress calculations.

### Files Changed

- [src/drafts/demandFrameScheduler.js](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/demandFrameScheduler.js)
  - Modified — [line 12](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/demandFrameScheduler.js:12) provides window defaults for `requestAnimationFrame` and `cancelAnimationFrame`, and accepts `renderFrame`.
  - Added — [line 128](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/demandFrameScheduler.js:128) provides `requestRender` alias.
- [src/drafts/WebglClassicDraft.jsx](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/WebglClassicDraft.jsx)
  - Modified — [line 744](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/WebglClassicDraft.jsx:744) passes explicit `requestAnimationFrame` and `cancelAnimationFrame` functions.
  - Modified — [line 793](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/WebglClassicDraft.jsx:793) maps camera framing output arrays to `cameraPos` and `cameraTgt`.
- [src/drafts/PhotorealPoolDraft.jsx](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/PhotorealPoolDraft.jsx)
  - Added — [line 31](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/PhotorealPoolDraft.jsx:31) imports `STORY_TIMING`.
  - Modified — [line 422](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/PhotorealPoolDraft.jsx:422) passes explicit `requestAnimationFrame` and `cancelAnimationFrame` functions.
  - Modified — [line 471](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/PhotorealPoolDraft.jsx:471) maps camera framing output arrays to `cameraPos` and `cameraTgt`.

## Draft 4 Classic and Draft 5 Photoreal Break Implementation (03/09/2026, 07:51 PM)

### Problem

Draft 2 had evolved through multiple texture passes, losing the ability to compare the pre-weave visual direction (`1b9d299`), while the Story lacked an uncompromised photoreal 3D draft built around dedicated table geometry, PBR physical materials, and GSAP choreography.

### Fix

- Implemented centralized data-driven registry `draftRegistry.js` supporting all 5 drafts: `cinematic`, `webgl`, `original`, `webgl-classic`, `photoreal`.
- Implemented **Draft 4 — 3D Break Classic** (`WebglClassicDraft.jsx`): Restored commit `1b9d299` pre-weave visual profile (fiber cloth, warm mahogany rails, leather pockets, earlier ball clearcoat) with modern lifecycle and scheduling.
- Implemented **Draft 5 — Photoreal Break** (`PhotorealPoolDraft.jsx`): Built purpose-authored 3D table geometry (`photorealGeometry.js`), production PBR materials (`photorealMaterials.js`), and paused GSAP choreography timeline (`photorealTimeline.js`) sought from Story progress.
- Extended `storySchedule.js`, `App.jsx`, and `styles.css` to seamlessly map all 3D Break drafts to the Studio handoff.

### Files Changed

- [src/drafts/draftRegistry.js](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/draftRegistry.js)
  - Created — unified data-driven configuration for all 5 drafts with query normalization.
- [src/drafts/draftRegistry.test.js](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/draftRegistry.test.js)
  - Created — unit tests for draft registry IDs, aliases, and fallbacks.
- [src/drafts/WebglClassicDraft.jsx](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/WebglClassicDraft.jsx)
  - Created — Draft 4 Classic renderer restoring pre-weave `1b9d299` materials.
- [src/drafts/photorealGeometry.js](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/photorealGeometry.js)
  - Created — regulation pool table geometry (slate, cushions, 3D pocket cavities, sights, hardware, cue stick).
- [src/drafts/photorealMaterials.js](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/photorealMaterials.js)
  - Created — PBR physical materials for felt, rails, sights, pockets, and phenolic balls.
- [src/drafts/photorealTimeline.js](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/photorealTimeline.js)
  - Created — paused GSAP master timeline driven by Story progress across named beats.
- [src/drafts/PhotorealPoolDraft.jsx](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/PhotorealPoolDraft.jsx)
  - Created — Draft 5 Photoreal renderer with 3-point lighting rig and demand scheduler.
- [src/components/DraftSwitcher.jsx](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/components/DraftSwitcher.jsx)
  - Modified — uses data-driven options from `draftRegistry.js`.
- [src/storySchedule.js](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/storySchedule.js)
  - Modified — maps `webgl`, `webgl-classic`, and `photoreal` to the 3D Break Studio handoff.
- [src/App.jsx](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/App.jsx)
  - Modified — registers and mounts Draft 4 and 5 with seamless controller and handoff sync.
- [src/styles.css](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/styles.css)
  - Modified — smooth horizontal layout for 5-option draft switcher.
- [package.json](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/package.json)
  - Modified — added `draftRegistry.test.js` to test script.

## Draft 2 (WebGL 3D) overall lighting and exposure increase (03/09/2026, 12:48 AM)

### Problem

Draft 2 rendered overly dark with crushed midtones and muted specular highlights due to low tone mapping exposure (`0.82`), dim environment reflection intensity (`0.42`), and low key/fill light values.

### Fix

- Raised `toneMappingExposure` from `0.82` to `1.15` in `WebglPoolDraft.jsx`.
- Raised `scene.environmentIntensity` from `0.42` to `0.72` for richer indirect lighting and PBR reflections.
- Boosted studio lighting rig: `overheadRectLight` to `2.75` (size `9.0x16.0`), `keyLight` to `1.85`, `overheadSpot` to `5.6`, `feltBounce` to `0.52`, `leftChamferFill` to `0.45`, `rightChamferFill` to `0.40`, and `rimLight` to `0.68`.
- Tuned cloth `feltMaterial` sheen to `0.45`, sheen roughness to `0.75`, and `envMapIntensity` to `0.28`.

### Files Changed

- [src/drafts/WebglPoolDraft.jsx](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/WebglPoolDraft.jsx)
  - Modified — [line 842](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/WebglPoolDraft.jsx:842) raises `toneMappingExposure` to `1.15`.
  - Modified — [line 860](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/WebglPoolDraft.jsx:860) raises `environmentIntensity` to `0.72`.
  - Modified — [line 905](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/WebglPoolDraft.jsx:905) increases cloth sheen and envMap intensity.
  - Modified — [line 1204](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/WebglPoolDraft.jsx:1204) boosts key, fill, spot, bounce, and rect area light intensities.

## Draft 1 (3D POV) restored grounded camera hover (02/09/2026, 01:24 AM)

### Problem

Draft 1's previous hover treatment translated and scaled the photograph and transparent canvas together. That made the parallax read as a flat background zoom instead of the 3D 8-ball responding to the pointer. Mobile and touch inputs also must not leave a stale camera offset.

### Fix

- Kept Draft 1's Story track locked to the calibrated photo while allowing the shared bounded camera/target pointer offsets to orbit the WebGL ball layer.
- Removed the paired CSS plate transform so hover moves the rendered 3D ball and its contact shadow, not a flat table/background layer.
- Added Draft 2-style soft contact shadows for all 16 balls, including the 8-ball, so camera movement retains a visible felt contact cue.
- Reset hover on pointer exit, blur, resize, capability changes, Draft deactivation, and touch/mobile input.
- Updated unit and browser framing tests in `cameraFraming.test.js` and `draft2-benchmark.spec.js` to require projected 8-ball movement and a locked Story track.

### Files Changed

- [src/drafts/PoolPovDraft.jsx](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/PoolPovDraft.jsx)
  - Modified — samples fine-pointer hover through the shared 3D camera framing contract.
  - Added — creates and updates 16 felt contact-shadow planes with the deterministic ball state.
- [src/drafts/cameraFraming.js](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/cameraFraming.js)
  - Modified — keeps the Story track plate-locked while applying bounded pointer camera/target offsets to the transparent 3D layer.
  - Modified — clears stale pointer state on exit, blur, resize, and touch input.
- [src/drafts/cameraFraming.test.js](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/cameraFraming.test.js)
  - Modified — verifies pointer camera parallax moves the 3D layer without advancing the locked Story track.

## Reduced speed of Phase 2 cue strike and rack break animation (24/08/2026, 02:24 AM)

### Problem

Phase 2 completed too quickly for the user to register the physical details of the cue strike, 8-ball travel, and rack scatter before transitioning into Studio.

### Fix

- Increased `CINEMATIC_BREAK_TRANSITION_DURATION` from `1.15s` to `2.2s` in `App.jsx`.
- Set `easeCinematicBreakTransition` to `1 - Math.pow(1 - progress, 2.2)` for immediate response on swipe detection with a smooth, readable deceleration.
- Tuned `CINEMATIC_HIT_PROGRESS` to `0.252` and `CINEMATIC_IMPACT_PROGRESS` to `0.35` in `poolBreakPhysics.js` for natural pacing.
- Expanded cue strike stroke to `0.032` and tuned recoil in `PoolPovDraft.jsx`.

### Files Changed

- [src/App.jsx](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/App.jsx)
  - Modified — [line 41](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/App.jsx:41) sets `CINEMATIC_BREAK_TRANSITION_DURATION = 2.2` and ease curve.
- [src/drafts/poolBreakPhysics.js](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/poolBreakPhysics.js)
  - Modified — [line 17](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/poolBreakPhysics.js:17) sets `CINEMATIC_HIT_PROGRESS = 0.252` and `CINEMATIC_IMPACT_PROGRESS = 0.35`.
- [src/drafts/PoolPovDraft.jsx](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/PoolPovDraft.jsx)
  - Modified — [line 539](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/PoolPovDraft.jsx:539) adjusts strike progress and recoil.

## Cue stick skipped the pre-hit stop during overscroll (06/08/2026, 01:20 AM)

### Problem

A large wheel scroll or touch swipe could skip the cue-ready position and immediately hit the 8-ball.

### Fix

- Added a cue-ready checkpoint at timeline progress `0.52 / 3`.
- Added Lenis `virtualScroll` input handling for wheel and touch input.
- Added reverse-scroll rearming below the checkpoint.
- Added `syncTouch: true` so mobile touch input uses the same hard-stop path.

### Files Changed

- [src/App.jsx](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/App.jsx)
  - Added — [line 25](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/App.jsx:25) defines `CUE_READY_PROGRESS`.
  - Added — [line 188](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/App.jsx:188) adds `handleVirtualScroll` to stop oversized wheel/touch input.
  - Added — [line 303](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/App.jsx:303) enables `syncTouch: true` for mobile touch control.
  - Added — [line 310](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/App.jsx:310) connects Lenis `virtualScroll` to the hard-stop handler.

## Lenis checkpoint lock delayed the next scroll (06/08/2026, 01:20 AM)

### Problem

After the cue reached the ball, the old gate kept the next scroll blocked behind a quiet-gap delay.

### Fix

- Kept Lenis locked only while it settles at the cue-ready checkpoint.
- Removed the `180ms` quiet-gap timer.
- Removed the post-checkpoint `latched` state.
- Set the gate to `passed` immediately in the Lenis `scrollTo` completion callback.
- The next wheel or touch input now continues without an extra wait.

### Files Changed

- [src/App.jsx](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/App.jsx)
  - Modified — [line 286](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/App.jsx:286) uses `lenis.scrollTo(checkpointScroll, { lock: true })` only during checkpoint settling.
  - Added — [line 292](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/App.jsx:292) sets `cueGateState = 'passed'` when Lenis finishes settling.
  - Removed — the `180ms` quiet-gap timer and post-checkpoint latch state.

## Artigusto Gelato Logo not displaying correctly (05/08/2026, 11:50 PM)

### Problem

The Artigusto logo showed a checkerboard, appeared blank, or sat too low inside the carousel card.

### Fix

- Replaced the old JPEG with `Artigusto-Gelato_Clearned.png`.
- Added `type: 'artigusto'` for scoped styling.
- Added absolute square positioning.
- Added circular clipping to hide the baked checkerboard.
- Added caption layering above the logo.

### Files Changed

- [src/App.jsx](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/App.jsx)
  - Modified — [line 9](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/App.jsx:9) now imports the cleaned PNG.
  - Removed — the old Artigusto JPEG import.
  - Added — [line 26](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/App.jsx:26) adds `type: 'artigusto'` for scoped card styling.
- [src/styles.css](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/styles.css)
  - Added — [line 671](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/styles.css:671) adds `.project-card.is-artigusto img` to center the logo and clip the baked checkerboard.
  - Added — [line 688](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/styles.css:688) adds caption layering above the image.
- [src/assets/Artigusto-Gelato_Clearned.png](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/assets/Artigusto-Gelato_Clearned.png)
  - Added — cleaned logo asset.

### Documentation Prompt

Update `DOCS/MAJOR BUG FIX.md` using this format:

Create one dated `##` subheading for the bug. Keep all bug entries sorted by descending date and time, with the newest entry first. Explain the problem and fix in plain English. Under `### Files Changed`, group entries by file. Use nested point-form bullets labeled `Added`, `Removed`, or `Modified`. Link each file and exact line number. Use inline code for changed selectors, imports, props, and values. Do not include code blocks or a separate files list.
