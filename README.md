# 8Ball Studio 2

## Map
- `frontend/`: Vite + React one-page studio site (3D pool break hero). Status: active
- `docs/`: hero break notes, marquee options, service media sources. Status: active

A one-page site: the 3D pool break (the 8-ball hits the rack) is the hero, followed by a gpt-taste
layout (statement and bento, scrubbed paragraph, horizontal accordion, stacking client cards,
marquee and a call-to-action footer).

## Run

    npm install
    npm run dev       # http://localhost:5173
    npm test          # break engine unit tests
    npm run build

## Layout

npm workspace: `frontend/` is the app (`@8ball/site`, Vite + React, deployed to Vercel).

- `frontend/components/`: every section, helper and the break engine, flat, kebab-case.
- `frontend/images/`: logos, pool plates, service reels and stills.
- `frontend/public/`: fonts and og image served as is.
- `.github/workflows/ci.yml`: unit tests + build on push and PR to `main`.

A backend would go in `backend/`, added to the root `workspaces` list.

## Where things live (frontend/)

- `components/pool-pov-draft.jsx`: the break scene. Its controller takes `setProgress(0..1)`.
  `break-hero.jsx` drives it from scroll.
- `components/pool-break-physics.js`, `camera-framing.js`, `pool-surface-textures.js`: the simulation and rendering.
- `components/story-stage.js`: the break's timing constants.
- `components/site-content.js`: all copy, services, clients and contact details (facts only, from the studio's PRODUCT.md).
- `components/`: one component per section, plus helpers and content.
- `index.css`: all styling. The break's rules are copied from 8Ball_Studio's `styles.css`.

<!-- test change: Open Diff On Click extension check (revert with git checkout README.md) -->
