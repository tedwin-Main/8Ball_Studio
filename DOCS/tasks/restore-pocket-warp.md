# Restore Pocket Black-Hole Warp

## Goal

Restore the black-hole warp from commit `643305d30f45f35bcc5e351ef72d184da0fb7c2d` after the 8-ball reaches the pocket.

## Scope

- Update `src/App.jsx` to render and initialize `.pocket-iris`.
- Add the scrubbed pocket expansion after the ball reaches and disappears into the target pocket.
- Retiming of the current Intro → Studio cue-hit sequence is allowed so the order remains: cue hit, ball roll, ball sink, black-hole expansion, Studio reveal.
- Keep every Intro tween fully settled by the `studio` label at timeline time `1.0`.
- Update `src/styles.css` with the old pocket-iris visual and responsive desktop/mobile placement.
- Keep the current four-page structure. Do not restore the removed Shot page, pagination, ball shadow, impact ring, or strike flash unless strictly required for the warp.
- Preserve project navigation, scroll physics, Artigusto styling, and unrelated dirty-worktree changes.
- Add short plain-English comments for the warp layer and timing.

## Restrictions

- Do not run automated tests or browser verification.
- Do not commit or push.
- Edit only `src/App.jsx` and `src/styles.css`.
