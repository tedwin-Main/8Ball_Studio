# Visitor Flow — 8 Ball Studio

How a visitor moves through the site's five Pages.

```mermaid
flowchart TD
    Load([Visitor opens the site]) --> Intro["Intro<br/>the pool break plays"]
    Intro -->|scrolls down| Studio["Studio<br/>8ightBall Studio name"]
    Studio -->|scrolls down| Services["Services<br/>video, design, marketing..."]
    Services -->|scrolls down| Projects["Projects<br/>client logos"]
    Projects -->|scrolls down| Contact["Contact<br/>pool table, WhatsApp/IG/email"]

    Contact --> Action{Visitor acts}
    Action -->|WhatsApp| Done([Message sent])
    Action -->|Instagram| Done
    Action -->|Email| Done

    Studio -.->|scrolls back up| Intro
    Services -.->|scrolls back up| Studio
    Projects -.->|scrolls back up| Services
    Contact -.->|scrolls back up| Projects

    style Intro fill:#07110d,color:#fff
    style Studio fill:#070908,color:#fff
    style Services fill:#000,color:#fff
    style Projects fill:#000,color:#fff
    style Contact fill:#0b5b3b,color:#fff
    style Done fill:#b7d95b,color:#000
```

## The five Pages

| # | Page | What's there |
|---|---|---|
| 1 | **Intro** | The pool break animation plays once |
| 2 | **Studio** | The studio name, held on screen |
| 3 | **Services** | What the studio offers, one panel per service |
| 4 | **Projects** | Client logos |
| 5 | **Contact** | WhatsApp, Instagram, email — on a pool table background |

Scrolling down moves forward one Page at a time. Scrolling back up retraces the same order, except
Studio → Intro needs a deliberate upward swipe (so a stray scroll doesn't replay the break).
