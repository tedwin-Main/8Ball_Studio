# 8Ball Studio 2

A one-page site: the 3D pool break (the 8-ball hits the rack) is the hero, followed by the statement and
bento, a scrubbed paragraph, the services, the client logo loop, a marquee and a call-to-action footer.

The site is front end only (Vite + React, no server). It lives in `frontend/`.

## Run

    cd frontend
    npm install
    npm run dev       # http://localhost:5173
    npm test          # unit tests (tests/unit)
    npm run build     # -> frontend/dist

## Deploy

Netlify reads `netlify.toml` at the repo root (base `frontend`, publishes `frontend/dist`).
On Vercel, set the project's **Root Directory** to `frontend` in the dashboard.

## Where things live

    frontend/
      index.html, package.json, vite.config.js, playwright.config.js
      public/                fonts, og image
      scripts/               one-off asset scripts
      tests/unit/            node --test unit tests
      src/
        main.jsx, App.jsx    entry and page shell
        Cursor.jsx           custom cursor and RollText links
        sections/            one component per page section (BreakHero, Statement, ClientLoop, Footer...)
        hero/                the 3D break: PoolScene.jsx (scene; controller takes setProgress(0..1)),
                             poolBreakPhysics.js, cameraFraming.js, poolSurfaceTextures.js...
        motion/              timing and animation helpers: storyStage.js (break timing), intro.js,
                             marqueeLoop.js, titleMotion.js, mediaMotion.js
        lib/                 content.js (all copy, services, clients, contacts) and servicesStyle.js
                             (the ?tune draft registry)
        assets/              images and video (assets/hero: the pool plates)
        styles/
          index.css          imports everything below, in order
          shared/            rules for every screen size, one file per section
          desktop/           min-width / hover: hover rules only
          mobile/            max-width (phone, narrow and touch) rules only
          shared/reduced-motion.css   reduced-motion overrides, loaded last

Each section's styles share a name across folders: the phone rules for the services drum are in
`styles/mobile/services-drum.css`, its desktop rules in `styles/desktop/services-drum.css`, and the rest in
`styles/shared/services-drum.css`. Load order is shared, then desktop, then mobile, then reduced-motion, so
a device rule wins over a shared rule of the same specificity.
