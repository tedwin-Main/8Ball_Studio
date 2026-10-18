# 8Ball Studio 2

A one-page site: the 3D pool break (the 8-ball hits the rack) is the hero, followed by a gpt-taste
layout (statement and bento, scrubbed paragraph, horizontal accordion, stacking client cards,
marquee and a call-to-action footer).

## Run

    npm install
    npm run dev       # http://localhost:5173
    npm test          # break engine unit tests
    npm run build

## Layout

Tier-grouped npm workspaces: `frontend/*` is a container, each subfolder is one app.

- `frontend/site/`: the public website (`@8ball/site`, Vite + React, deployed to Vercel).
- `.github/workflows/ci.yml`: unit tests + build on push and PR to `main`.

A new app (e.g. `frontend/admin/`) gets its own `package.json` and is picked up by the workspace glob.
A backend would go in `backend/<app>/`, added to the root `workspaces` list.

## Where things live (frontend/site)

- `src/drafts/PoolPovDraft.jsx`: the break scene. Its controller takes `setProgress(0..1)`.
  `BreakHero.jsx` drives it from scroll.
- `src/drafts/poolBreakPhysics.js`, `cameraFraming.js`, `poolSurfaceTextures.js`: the simulation and rendering.
- `src/storyStage.js`: the break's timing constants.
- `src/content.js`: all copy, services, clients and contact details (facts only, from the studio's PRODUCT.md).
- `src/sections/`: one component per section, in page order.
- `src/index.css`: all styling. The break's rules are copied from 8Ball_Studio's `styles.css`.
