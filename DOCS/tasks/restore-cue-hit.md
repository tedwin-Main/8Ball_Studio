# Restore Cue Stick Hit

## Goal

Restore the visible cue stick and its hit against the 8-ball using commit `643305d` as the behavior reference.

## Scope

- Update `src/App.jsx` to render the cue stick and scrub its approach, contact, recoil, and fade with the current GSAP timeline.
- Update `src/styles.css` to restore cue-stick visuals and responsive positioning for desktop and mobile.
- Keep the current simplified page structure. Do not restore the removed Shot page or pagination phase.
- Make the cue contact the current 8-ball position before the ball rolls toward the pocket.
- Preserve current scroll scrubbing, project navigation, Artigusto handling, and unrelated local edits.
- Add short plain-English comments for the restored animation stages and responsive offsets.

## Reference

- Commit `643305d` contains the last full cue-stick implementation.
- Reuse only the cue rendering, styling, and hit timing needed by the current timeline.

## Restrictions

- Do not run automated tests or browser verification.
- Do not commit or push.
- Edit only `src/App.jsx` and `src/styles.css`.
