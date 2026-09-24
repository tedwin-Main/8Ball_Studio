---
version: 1
slug: "src-app-jsx"
primary_target: "src/App.jsx"
related_targets: ["src/styles.css","src/looks/downlight.css","src/looks/LookScenery.jsx"]
---

# Surface brief: 8 Ball Studio Story (src/App.jsx)

Scope: Studio, Projects, and Contact Pages, the intro overlay, and all chrome. The 3D pool-break Intro scenes are kept unchanged.
Mode: Persuade. Audience: KL SMB/F&B owners and regional marketing teams, weighted equally. Success: a message on WhatsApp, Instagram, or email.
Proof: 4 client logos only; never invent case studies or metrics.
Scroll model: one transition only (Intro → Studio, on the pinned stage). Studio holds for about half a screen, then Studio, Projects, and Contact scroll as normal sections: no transitions, static content.
Looks: the site ships switchable looks (?look=); Downlight is the default. The other looks stay switchable at draft quality.

## Direction contract

THESIS: The site is the table seen from the lamp. After the break, the camera hangs where the shade is and looks straight down: every Page is the bed under one downlight, walnut rails and six pockets around it, the hall black beyond. It refuses the dark page with a neon accent: the only light is the lamp, and it falls on the cloth.

OWN-WORLD:
- Cloth green (#1e6a46) lit hot under the shade and falling hard to #06170e at the cushions; hall black (#030403) around the table; walnut rails from the real CC0 wood scan with ivory diamond sights; six leather-lined pockets.
- Ivory (#f3eee2) Schibsted Grotesk: 860 caps for titles, 650 for labels. Secondary controls are dark chips on the hall floor.
- Balls as markers: services are the 1 (yellow), 2 (blue), and 3 (red) balls; nav links lead with the 2-ball (Projects), the 8-ball (Contact), and the cue ball (Top). Overhead light: shadows sit directly under things, soft on every side.
- Chalk blue (#2f6cb3) is the only colour off the table's own, used for the contact highlight rub.

STORY: The visitor sees the break (craft). Then the downlight comes on over the table and 8 BALL STUDIO rolls onto the cloth, with the three services racked as the first three balls. Scrolling on, the next table under its lamp holds the four clients laid flat; the last holds the three ways to get in touch.

FIRST VIEWPORT (Studio): The whole table from above fills the frame inside a black hall margin. 8 BALL / STUDIO in ivory 860 caps top-left on the cloth (about 8.4vw); the services as the 1-2-3 balls with their names at lower right; the location in small ivory caps at lower left; the header across the top, logo left and the ball-led nav right. Contact Us (the 8-ball) is the primary action.

FORM: Downlight (overhead, top-down table), #1 on the re-roll 2 grounded list, presented as IMPECCABLE'S PICK and chosen; seed key b4bcb539 (re-roll 2). Code-led; the decision comp .impeccable/mocks/decision/downlight.png is the critique reference.
- Signature interaction: the Intro → Studio cue. The downlight switches on as a rectangle opening from the table's centre while the title letters roll onto the cloth, turning as they come and stopping on friction (left to right); the service balls roll in from the left. The pointer sways the lamp's hotspot on the cloth.
- Motion: scrubbed on the pinned stage only; nothing moves on Projects or Contact but the scroll.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
