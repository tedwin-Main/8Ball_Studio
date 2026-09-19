# Specification: Realistic Break Spread for the Intro Break Simulation

## Problem Statement

When a visitor scrolls through the Intro page's break moment (in any Draft that renders the deterministic break simulation), the rack dispersion looks flat and artificial:

1. **Lateral-only scatter**: the rack disperses mostly sideways as one uniform wave, with little down-table or up-table depth, so the spread reads as a 2D fan rather than an explosive 3D-feeling break.
2. **The lone forward ball**: a single ball drifts toward the front (up-table) while everything else slides sideways, which reads as a glitch rather than cue-ball action.

Both symptoms trace back to the current break configuration, not the solver:

- The striker hits the rack apex almost dead center (`impactOffsetX` ≈ 3.4 mm on a 70 mm diameter), producing a near-perfectly symmetric — and therefore flat-looking — spread.
- The striker is 2.3× the mass of an object ball, so instead of transferring its energy and deflecting (as an equal-mass cue ball does), it plows through the rack. That plow-through *is* the "one ball moving toward the front."
- The launch speed (5.2 m/s) is gentle by real break standards, so few balls reach the cushions and there is no return traffic re-mixing the pack.

## Solution

Retune the deterministic break configuration so the scatter behaves like a real power break, using configuration-level changes to the existing simulation:

1. **Equal-mass striker** (`massMultiplier` 2.3 → 1.0): the cue ball obeys real billiards physics — it deflects, stops, or follows instead of shoving through the rack. This removes the artificial lone forward ball at its source.
2. **Off-center (cut) impact**: increase `impactOffsetX` into a genuine cut-break range (order of 10–15 mm rather than 3.4 mm) so the scatter is asymmetric — more action on one side, a wing ball driving toward a corner, and natural variation in ball directions.
3. **Real break pace**: raise `launchSpeed` (order of 7 m/s rather than 5.2 m/s) so leading balls reach the cushions and rebound back into the pack, creating the mixed depths and secondary collisions that make a spread feel organic.
4. **Secondary tuning levers if needed**: a slightly looser rack (`rack.gap`) staggers how rows separate; slightly livelier cushions (`cushionRestitution`) increase return traffic. These are optional and only adjusted if the first three changes don't achieve the look.
5. **Re-derive the milestone contract**: the spread milestone thresholds (`ballsOutsideRack`, `rmsBallDiameters`) are re-measured against the retuned break so the transition milestone is still reached naturally within its time window.

The result: after impact, a few balls rocket to the rails, several travel at moderate speed, some barely move, and the cue ball has believable post-impact action — a spread with depth, asymmetry, and speed variety instead of a flat sideways wave.

## User Stories

1. As a site visitor scrolling the Intro page, I want the rack to explode outward in many directions with visible depth, so that the break feels like a real pool break rather than a 2D animation.
2. As a site visitor, I want the scatter to be asymmetric, so that the break looks like a physical event rather than a mirrored special effect.
3. As a site visitor, I want some balls to travel much farther and faster than others, so that the spread has visual rhythm instead of a uniform wave.
4. As a site visitor, I want to see balls strike the cushions and rebound back into the pack, so that the table feels like a bounded physical space.
5. As a site visitor, I want the cue ball (striker/8-ball, per the Draft's framing) to deflect or check up after impact, so that its motion reads as real billiards physics instead of a ball plowing through the rack.
6. As a site visitor, I want no single ball drifting mysteriously toward the front of the table, so that nothing in the break reads as a glitch.
7. As a site visitor on any Intro Draft that renders the break simulation, I want the same improved break behavior, so that the experience is consistent regardless of which visual treatment is active.
8. As a site visitor scrubbing the Story backwards, I want the break to replay in exact reverse, so that the deterministic reversibility of the Story is preserved.
9. As a site visitor, I want the break to reach its spread milestone within the established transition timing, so that the handoff to the next Story beat still fires correctly.
10. As a developer, I want the break to remain fully deterministic and cached, so that scroll-driven sampling, tests, and reverse playback stay exact.
11. As a developer, I want the fix to live in the break configuration rather than in presentation-layer tricks, so that every Draft benefits from one change and the physics stays honest.
12. As a developer, I want milestone thresholds re-derived from measured simulation output, so that the transition contract reflects the new break rather than being tuned blind.

## Implementation Decisions

- **Single module touched**: all changes are confined to the deterministic break physics module (its default break configuration, its rack construction, and, if needed, its milestone thresholds). No Draft, timeline, camera, or rendering code changes.
- **Config-first change**: the retune is expressed through the existing simulation config shape (`striker.massMultiplier`, `striker.impactOffsetX`, `striker.launchSpeed`, optionally `rack.gap` and `table.cushionRestitution`), plus the one approved addition below. No other solver features are introduced.
- **Rack seating variance (approved scope addition)**: measurement over 1,728 config combinations showed every config-only retune still collapses the pack into a lateral line under 2.5 ball diameters deep, because the plate composition pins the rack close to the foot rail and leaves the pack no room to open down-table. A deterministic per-ball seating offset (`rack.gapJitter`, sub-millimetre, fixed hash, no randomness) is therefore part of the retune. It roughly doubled the measured spread depth (1.7 → 3.3 ball diameters) while keeping the break's milestone natural. The apex ball is exempt so the Draft 1 photo-plate rack anchor stays exact, and `gapJitter: 0` restores the perfectly symmetric rack.
- **Determinism is a hard constraint**: no randomness may be introduced. The break must remain a pure function of its config so the frozen frame graph stays exactly reverse-sampleable by the existing samplers.
- **Interfaces unchanged**: `createBreakSimulation`, `getBreakSimulation`, and the three sampling functions keep their current signatures and return shapes. Consumers require no modifications.
- **Milestone re-derivation**: after retuning, `milestone.ballsOutsideRack` and `milestone.rmsBallDiameters` are updated so `naturalMilestone` remains `true` inside the existing `minimumTime`/`maximumTime` window. The time window itself stays unchanged. Measured on the retuned break, the shipped thresholds are still reached naturally at the minimum time.
- **The striker must not be pocketed before the freeze**: several candidate cut angles sent the striker into a corner pocket at 0.65 s, a visible change to the studio's hero ball. The shipped tuning keeps the striker on the table through the spread milestone, as the previous tuning did.
- **Final values chosen by measurement**: the exact retuned numbers are selected by running the simulation and inspecting spread metrics and diagnostics (and a visual check in the browser). The targets are the behavioral outcomes in the User Stories, not specific magic numbers.
- **Stale rationale comments updated**: configuration comments that describe the old design intent (e.g. the heavy-striker/slow-launch rationale) are rewritten to describe the new intent.

## Testing Decisions

- **One seam, the existing one**: all new tests target the deterministic simulation boundary (config in → frames, milestones, and diagnostics out), matching how the current break physics tests work. Drafts sample the sim untested, as they do today; no new seams are introduced.
- **Test external behavior only**: assert observable properties of the simulated break, not internal solver mechanics.
- **Tests added in the existing break physics test module** (`node:test`, run by `npm test`):
  - *Asymmetry*: at the milestone frame, the rack-ball centroid is measurably off the table centerline (the cut break produces a lopsided scatter).
  - *Depth, not a flat wall*: the spread's horizontal interquartile range is under three times its vertical interquartile range, and the vertical range clears 2.5 ball diameters.
  - *Cue-ball contract*: the striker is equal mass and is still on the table at the milestone frame.
  - *Speed variety*: at an early post-impact frame, ball speeds span a wide range (a few fast movers, several slow ones) rather than clustering around one value.
  - *Cushion traffic*: diagnostics record cushion impacts during the break window, confirming balls reach and rebound off rails.
  - *Milestone contract*: the retuned break still reaches its milestone naturally within the configured time window.
  - *Rack seating semantics*: the apex ball stays exactly on the configured anchor, the same config reproduces identical rack seating, and zero seating variance restores a perfectly symmetric rack.
  - *Determinism*: two independently created simulations with the default config produce identical frame data.
  - *Solver health*: no unresolved overlaps and no positive energy corrections beyond existing tolerances at the final frame.
- **Prior art**: the existing break physics test module already asserts scatter, milestone timing, fade timing, and handoff behavior through the public samplers; new tests follow the same style.
- **Regression checks**: `npm test` passes and `npm run build` succeeds.

## Out of Scope

- Presentation-layer variance tricks (per-ball easing, staggered sampling, camera effects) to fake a better spread.
- New solver capabilities: ball hop/jump (vertical break dynamics), masse or jump shots, per-ball material properties.
- Changes to pocket capture behavior or pocket geometry.
- Changes to any Draft's choreography, camera framing, lighting, or timing contract.
- A variant-switching mechanism (query params, UI toggle) for comparing break candidates live; tuning happens during implementation, and one retuned break ships.
- The photo-based plate of the Original Draft.

## Further Notes

- The root causes are config-level, so this should be a small, low-risk change with an outsized visual payoff. Resist adding solver features.
- Real power breaks run roughly 8–9 m/s; the retuned `launchSpeed` should move toward that regime but the final value is whatever reads best at the scene's scale and timing.
- An equal-mass striker that arrives in a rolling state will naturally follow through on a near-head-on hit; the cut impact angle is what turns that follow-through into believable cue-ball deflection, which is why the offset and mass changes should land together.
