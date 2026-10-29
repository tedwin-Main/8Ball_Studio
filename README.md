# 8Ball Studio 2

## Map
- `src/features/`: one folder per site feature (pool-break, intro, navigation, services, manifesto, clients, marquee, wordmark, footer, cursor). Status: active
- `src/common/`, `src/config/`: shared utils + global styles, site copy. Status: active
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

npm workspace: `src/` is the app (`@8ball/site`, Vite + React, deployed to Vercel).

- `src/features/<name>/`: one feature each, `.jsx` next to its `.css`, unit tests beside code, `index.js` barrel.
  - `pool-break/`: three.js break engine, its CSS and unit tests.
  - `intro/`: preloader, break hero, intro state.
  - `navigation/`, `cursor/`, `footer/`, `wordmark/`, `manifesto/` (manifesto + statement), `services/`, `clients/`, `marquee/`.
- `src/common/utils/`: shared helpers (math, freeze, title + media motion).
- `src/common/styles/`: global CSS (theme tokens, page base, buttons, roll text, motion and phone tweaks).
- `src/config/site-content.js`: all site copy.
- `src/images/`: logos, pool plates, service reels and stills.
- `src/public/`: fonts and og image served as is.
- `.github/workflows/ci.yml`: unit tests + build on push and PR to `main`.

## Where things live (src/)

- `features/pool-break/pool-break-scene.jsx`: the break scene. Its controller takes `setProgress(0..1)`.
  `features/intro/break-hero.jsx` drives it from scroll.
- `features/pool-break/pool-break-physics.js`, `camera-framing.js`, `pool-surface-textures.js`: the simulation and rendering.
- `features/pool-break/story-stage.js`: the break's timing constants.
- `config/site-content.js`: all copy, services, clients and contact details (facts only, from the studio's PRODUCT.md).
- `features/`: one folder per section; cross-feature imports go through each `index.js`.
- `index.css`: imports every stylesheet in cascade order. The break's rules are copied from 8Ball_Studio's `styles.css`.

<!-- test change: Open Diff On Click extension check (revert with git checkout README.md) -->
