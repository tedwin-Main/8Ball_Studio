# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, weighted equally:

- **Local brands:** Greater Kuala Lumpur SMBs, F&B, and retail owners (the Artigusto Gelato / Haruplate kind) who need someone to run their social content. They usually reach out on WhatsApp or Instagram.
- **Larger brands:** regional or corporate marketing teams (the Shopee / ERS Energy kind) evaluating a content studio. They are more likely to send a brief by email.

Both arrive to answer the same question: can this studio make our brand look good on social, and how do we start?

## Product Purpose

8 Ball Studio is a creative studio based in Greater Kuala Lumpur, Malaysia, offering three services:

- Social Content Management
- Video & Photography
- Graphic Design

The site exists to make a visitor understand that offer quickly and contact the studio. Success means a message on WhatsApp, Instagram, or email.

## Positioning

**Open.** The studio's claim to difference hasn't been stated yet. Future work must not invent one; confirm it with the owner.

## Operating Context

The site is one linear Story of four Pages: Intro, Studio, Projects, Contact (see `CONTEXT.md` for the vocabulary). Visitors move through it by scroll, touch, key, or page marks, one Page per gesture. The Intro is a 3D pool break: the 8-ball rolls into a rack and scatters it. It has selectable Drafts (`01 3D POV`, `02 3D Break`, `03 Original`).

## Capabilities and Constraints

- React 19 + Vite, GSAP 3.13 (ScrollTrigger, CustomEase, and more), Lenis weighted scroll, Three.js for the Intro scenes.
- The Intro pool-break scenes are kept as the signature moment. Their felt green and walnut (Draft 1 is a photographic plate) are fixed materials that the surrounding design must sit with.
- Story navigation, timing (`src/storyTiming.js`), and the page schedule are tested contracts. Visual changes must keep those tests passing.

## Brand Commitments

- Name: 8 Ball Studio (Instagram handle `@8ightball.studio`).
- The 8-ball logo mark (`src/assets/8BALL-V4.jpg`: black circle, white 8) is fixed.
- The tagline "Roll with us." and the wording of the service list are open to revision, with owner approval. The facts they state are not.

## Evidence on Hand

- Client logos: Artigusto Gelato, ERS Energy, Haruplate, Shopee (`src/assets/`).
- Contact: WhatsApp +60 12-783 7511, Instagram @8ightball.studio, email 8ightball.studio@gmail.com.
- Location: Greater Kuala Lumpur, Malaysia.
- **Absent, never to be fabricated:** case studies, project media, metrics, testimonials, team bios, awards, pricing.

## Product Principles

1. The work leads. Until real media exists, the client roster and the Intro's craft are the proof. Never pad them with invented claims.
2. One clear next step. Every Page should leave the visitor one short move away from contacting the studio.
3. Both audiences, one voice: approachable for a café owner, credible for a regional marketing team.
4. Motion is the medium. The studio sells video and content, so how the site moves is itself a demonstration.
