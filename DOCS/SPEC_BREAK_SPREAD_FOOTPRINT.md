# Specification: Wider Break Spread Footprint

## Problem Statement

The intro break scatter still reads small: after the ball rolls in and strikes the rack, most of the pack settles into a band near the far rail and stays there. On the plate-locked Draft 1 in particular, the scatter occupies a thin strip at the far end of the photo table, so the break looks contained rather than covering the table.

Measured on the currently shipped break (after the realism retune), at the spread milestone:

- 8 of 15 rack balls remain within 0.13 m of the foot rail; only one rack ball passes mid-table.
- The pack's centroid ends just 1.9 ball diameters from its starting position.
- The pack's spread is 7.9 ball diameters wide but only 3.3 deep — wide, but shallow against the rail.

The physics ceiling is real: the photo-plate composition pins the rack close to the foot rail, so the pack can only open in one direction, and the current tuning spends most of its energy on sideways motion into the side rails rather than out into the open felt.

## Solution

Retune the break so the pack expands across a materially larger share of the table — more balls traveling out of the rack zone at varied speeds and directions, more cushion rebounds returning into the open felt, and the pack's centroid visibly displaced from the rack — while staying inside the playfield at all times.

Levers, in priority order (all configuration-level; final values chosen by measurement):

1. **Rebound energy**: livelier cushions return more speed into the open table, so balls that reach a rail come back with enough pace to contribute to the footprint instead of dying against the rail.
2. **Travel**: lower rolling deceleration lets balls keep rolling into open space instead of stalling near the rail.
3. **Strike energy and angle**: the launch pace and cut offset are re-tuned together so the opening direction feeds the open table rather than the side rails.
4. **Rack seating**: the existing deterministic seating variance is re-tuned alongside the above so the pack still opens unevenly.
5. **Freeze moment**: the spread milestone window may let the footprint develop longer if the wider shape needs it (the scroll pacing contract does not change — only when in the simulation the milestone lands).

The result on every Draft: the rack scatters across the felt instead of collecting along the far rail, with several balls clearly out of the rack zone and rebounding back into open space.

## User Stories

1. As a site visitor on any Intro Draft, I want the break to spread balls across most of the visible table, so that the break feels like a real shot rather than a contained shuffle.
2. As a site visitor on Draft 1 (plate-locked POV), I want balls to travel toward the foreground of the photo, so that the scatter reads with depth from the fixed camera angle.
3. As a site visitor, I want several balls to reach the cushions and rebound back into open felt, so that the table reads as a bounded physical space being used.
4. As a site visitor, I want balls to travel at visibly different speeds and distances, so that the spread has rhythm instead of a single uniform wave.
5. As a site visitor, I want the pack's center of mass to visibly move after the break, so that the rack looks opened rather than rattled in place.
6. As a site visitor, I want balls to stay over the photo's felt at all times, so that no ball ever floats over the background or escapes the table.
7. As a site visitor, I want pocketed balls to drop into their pockets, so that corner and side pocket action still reads as intended.
8. As a site visitor, I want the 8-ball (the striker) to remain on the table through the settle, so that the intro's hero ball does not vanish mid-story.
9. As a site visitor scrubbing the Story backwards, I want the wider scatter to replay in exact reverse, so that the deterministic reversibility of the Story is preserved.
10. As a site visitor, I want the scroll pacing of the break and the handoff into Studio to feel unchanged, so that the wider spread does not cost interaction time.
11. As a developer, I want one shared break simulation serving every Draft, so that the scatter stays consistent and there is no per-draft physics fork.
12. As a developer, I want the tuning to land through measured, scored parameter sweeps rather than by eye alone, so that the footprint claims are verifiable numbers.
13. As a developer, I want the photo-plate rack registration to stay within its existing tolerance, so that Draft 1's 3D balls keep tracking the photographed table.
14. As a developer, I want the change confined to the break simulation module, so that no Draft, framing, or timeline code needs to move.

## Implementation Decisions

- **One module, one seam**: all changes stay in the deterministic break physics module — the default break configuration and, only if the footprint needs more development time, the milestone window fields. No Draft, framing, timeline, or rendering code changes.
- **Shared break**: one configuration serves every Draft. No per-draft simulation overrides are introduced.
- **Felt containment is a hard rule**: no non-pocketed ball may ever leave the playfield bounds in any frame, and any pocketed ball must resolve inside its pocket's capture region. If any tuning exposes balls escaping through a pocket mouth into open space, that escape is fixed at the capture/geometry level as a precondition for shipping the tuning.
- **Striker contract carried forward**: the striker is not pocketed before the spread milestone, matching the current behavior.
- **Timing contract unchanged**: scroll pacing, scatter duration, and handoff thresholds stay as they are. `milestone.minimumTime` stays fixed; only `milestone.maximumTime` may grow if measurement shows the wider footprint needs a later natural freeze.
- **Determinism is a hard constraint**: no randomness. The existing deterministic rack seating variance pattern may be re-tuned but not replaced with true randomness.
- **Rack position is locked**: the rack stays where the photo plate anchors it. Any approach that requires moving the rack is out of this spec.
- **Measurement workflow**: parameter sweeps are scored against footprint metrics (spread depth, pack centroid travel, balls out of the rack zone, cushion traffic) and the result is verified with browser captures on Draft 1 and Draft 2 before shipping.
- **Escalation over invention**: if the configuration levers cannot reach the acceptance thresholds, the finding goes back for a decision instead of introducing new solver features mid-implementation.

## Testing Decisions

- **One seam, the existing one**: all assertions target the deterministic simulation boundary (config in → frames, milestones, and diagnostics out), matching the shipped break tests. Drafts sample the sim untested, as today; no new seams.
- **Test external behavior only**: assert observable properties of the break, not internal solver mechanics.
- **Tests to add/extend in the existing break physics test module** (`node:test`, run by `npm test`):
  - *Footprint depth*: the pack's vertical interquartile range at the milestone frame clears the agreed threshold (target: at least 5 ball diameters; the floor is set from measured candidates during implementation).
  - *Balls out of the rack zone*: at least the agreed number of rack balls (target: 3) end up-table of mid-table at the milestone frame.
  - *Pack displacement*: the pack's centroid ends clearly displaced from its starting position (target: at least 3 ball diameters).
  - *Felt containment*: no non-pocketed ball leaves the playfield bounds in any frame; every pocket capture resolves within the pocket's capture radius.
  - *Striker contract*: the striker remains on the table at the milestone frame.
  - *Cushion traffic*: cushion impact count meets or exceeds the current break's count.
  - *Milestone contract*: the spread milestone is still reached naturally inside the (possibly extended) time window.
  - *Carried forward*: asymmetry, speed variety, rack seating semantics, determinism, and solver health assertions continue to hold.
- **Prior art**: the existing break physics test module; the wider-spread assertions extend the same style.
- **Regression checks**: `npm test` passes and `npm run build` succeeds. The Draft 1 photo-plate registration error stays within its existing 2px browser-benchmark tolerance.

## Out of Scope

- Per-draft break divergence (the break stays shared).
- Camera, framing, plate calibration, lighting, or choreography changes.
- Presentation-layer spread tricks (per-ball easing, staggered sampling).
- Moving the rack or re-shooting the photo plate.
- New solver capabilities (vertical hop, per-ball material properties, true randomness).
- Changes to scroll pacing, scatter duration, or the Studio handoff contract.
- Changes to pocket geometry or capture behavior beyond fixing an exposed escape as a shipping precondition.

## Further Notes

- The shipped break already improved realism (equal-mass striker, cut hit, real pace, rack seating variance); this spec builds on that tuning rather than replacing it.
- The current break's scatter is essentially settled by the minimum milestone time; most later simulation motion is residual. A wider footprint therefore comes from physics energy distribution, not from simply freezing later.
- The photo plate pins the rack near the foot rail; the open felt available for the footprint lies up-table of the rack, toward the camera. That geometry is why rebound energy and travel distance are the lead levers.
