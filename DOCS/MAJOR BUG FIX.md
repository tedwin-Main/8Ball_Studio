# Major Bug Fixes

## Draft 1 (3D POV) grounded mouse hover response (01/09/2026, 10:39 PM)

### Problem

Draft 1 uses a fixed photographic table plate. Moving only its WebGL camera on mouse hover shifts the 8-ball away from the photographed table and makes it appear to float. Mobile and touch inputs also must not leave a stale hover offset.

### Fix

- Kept Draft 1 camera parallax disabled by the `lockToPlate` framing contract.
- Routed fine-pointer hover through the existing demand scheduler as a bounded key-light and striker-reflection response, keeping ball geometry and photo anchors fixed.
- Reset hover on pointer exit, blur, resize, capability changes, Draft deactivation, and touch/mobile input.
- Updated unit and browser framing tests in `cameraFraming.test.js` and `draft2-benchmark.spec.js`.

### Files Changed

- [src/drafts/PoolPovDraft.jsx](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/PoolPovDraft.jsx)
  - Modified — [line 487](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/PoolPovDraft.jsx:487) samples fine-pointer hover without moving the plate-locked camera.
  - Modified — [line 524](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/PoolPovDraft.jsx:524) applies bounded light and striker-reflection response.
- [src/drafts/cameraFraming.js](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/cameraFraming.js)
  - Modified — [line 256](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/cameraFraming.js:256) rejects pointer camera offsets when `lockToPlate` is active.
  - Modified — [line 119](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/cameraFraming.js:119) clears stale pointer state on exit, blur, resize, and touch input.
- [src/drafts/cameraFraming.test.js](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/cameraFraming.test.js)
  - Modified — [line 73](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/drafts/cameraFraming.test.js:73) verifies pointer changes cannot move photo-plate framing.

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
