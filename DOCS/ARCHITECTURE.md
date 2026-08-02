# 8Ball Studio — System Architecture & Flow

## 1. Overview
Interactive scroll-driven 3D story experience web application built for 8Ball Studio.

---

## 2. Tech Stack
- **Framework & Library**: React 19 (`react`, `react-dom`)
- **Build Tool & Dev Server**: Vite 7 (`@vitejs/plugin-react`, `vite`)
- **Animation Engine**: GSAP 3 (`gsap`, `ScrollTrigger`)
- **Styling**: Vanilla CSS3 (CSS Variables, 3D Transforms, Responsive Layouts, Google Fonts `Inter` & `DM Mono`)
- **Module System**: ES Modules (`"type": "module"`)

---

## 3. Directory Structure
```
8Ball_Studio_Codex/
├── DOCS/
│   ├── ARCHITECTURE.md
│   └── VERCEL_DEPLOYMENT_OPTIONS.md
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── App.jsx
    ├── main.jsx
    └── styles.css
```

---

## 4. Architectural Components & Flow

### 4.1 Entry & Mounting
- `index.html` loads `/src/main.jsx`.
- `main.jsx` renders `<App />` within `React.StrictMode` attached to DOM element `#root`.

### 4.2 Application Architecture (`App.jsx`)
- **Root Container**: `<main className="experience">` wrapper housing `<section className="story">` canvas pinned during scroll.
- **Stage Elements**:
  - `<PoolTable />`: Renders 3D pool table frame, wood grain, felt light highlights, rails, and pockets (targeting `top-right`).
  - `<EightBall />`: Renders custom 8-ball graphics rig.
  - Interactive Overlays: Cue stick (`.cue-stick`), ball shadow (`.ball-shadow`), impact ring, strike flash, pocket iris transition mask.
- **UI Interfaces**:
  - `.scene-interface`: Brand header, hero copy ("Make the first move"), scroll prompt ("Scroll to break").
  - `.title-screen`: Final reveal card showing logo ("8 Ball Studio"), location metadata ("Greater Kuala Lumpur, Malaysia"), and ambient orbit elements.
- **Custom Pointer System**:
  - Listens to `pointermove` events with `requestAnimationFrame` throttle.
  - Updates root CSS variables (`--pointer-x`, `--pointer-y`) for dynamic background lighting.
  - Animates `.cursor-dot` and `.cursor-ring` following cursor coordinates.

### 4.3 Animation Timeline & ScrollTrigger Flow
Controlled inside `useLayoutEffect` with `gsap.context()` for clean React unmount lifecycle management.

1. **Reduced Motion Check**:
   - `prefers-reduced-motion: reduce` degrades gracefully to static positions without pinned ScrollTrigger.
2. **Responsive Breakpoint Adaptive (`gsap.matchMedia`)**:
   - Desktop (`min-width: 769px`) & Mobile (`max-width: 768px`) tune scale factors, coordinates, and pinning duration (`5.6x` vs `5.1x` inner height).
3. **Scrubbed Scroll Sequence**:
   - **Phase 1 (Zoom & Setup, t = 0.0 - 2.35)**: Pool table unzooms (`scale: 2.5 -> 1.0`), tilts 3D perspective. 8-ball positions from macro view to break line. Hero text fades out.
   - **Phase 2 (Cue Aim & Shot, t = 2.30 - 3.54)**: Cue stick swivels in, pulls back, and strikes ball.
   - **Phase 3 (Impact & Flash, t = 3.54 - 3.62)**: Impact ring expands, flash overlays, ball squashes visually.
   - **Phase 4 (Ball Roll & Sink, t = 3.62 - 4.96)**: Ball rolls 910° diagonally into top-right pocket. Shadow follows path. Ball sinks and pocket glows.
   - **Phase 5 (Iris Transition & Final Reveal, t = 4.96 - 6.12+)**: Pocket iris scales up (38x-42x) masking stage. Final title screen uncurtains staggered text animation.
