# Portfolio: an experience in five chapters

The public portfolio now uses a fixed viewport. Wheel gestures, touch swipes,
keyboard arrows / Page Up / Page Down / Home / End, and the numbered chapter
buttons navigate Introduction, Work, Journey, About, and Contact. The URL hash
identifies the chapter, including across the English / Arabic switch. Long lists
have their own scroll regions; they do not make the document travel vertically.

## Visual identity

Warm ivory, charcoal, orange, and a lavender work chapter replace the earlier
architectural proposal. There are no buildings or skyline assets. The custom
vector mark, **The Fold**, consists of two connected folded paths and an orange
forward segment. Editable SVG originals live in `web/public/brand/`; the header,
splash, and favicon share the same geometry. The name accompanies the mark in
English or Arabic. Manrope, IBM Plex Mono, and Noto Sans Arabic are hosted locally
with their OFL licences, so fonts never require a third-party request.

## Motion

`Sculpture.tsx` owns one lazy-loaded Three.js renderer. Five tube surfaces share
vertex topology; their positions and normals interpolate between an interwoven
intro, a connected project loop, an ascending career path with milestones, a
five-lobed skills form, and a conversation outline. Labels and the surrounding
elements change with the chapter. Pointer motion adds restrained parallax.

The opening sequence runs on each full load / refresh, once per SPA lifetime.
The mark assembles from its separate paths, and twelve
screen panels scatter with depth and staggered timing. The underlying page enters
in sequence. The intro is skippable and lasts at most 1.5 seconds. Reduced-motion
visitors get a brief static opening and paused 3D; motion can also be paused with
the persistent control. The renderer suspends work in hidden tabs and disposes
its geometries, materials, textures, observers, and animation frame on unmount.
Unavailable or lost WebGL falls back to a CSS form; all navigation and content
remain ordinary HTML.

RAF elapsed time is clamped to zero as well as a maximum. A first callback's
timestamp can precede the setup time after shader compilation; passing that
negative time to the open career curve otherwise produces an invalid point.

## Other pages and content

The complete journey is an interactive career archive with selectable roles,
dates, highlights, and previous / next controls. Hover and keyboard focus preview
a role; click or tap pins it. Every role has its own selected milestone on the 3D
path, including roles that share a year. The project index and each project page
share the visual system. Covers, technology chips, case-study paragraphs, and
optional repository/live links appear when supplied. The public API remains the content source;
no credentials, analytics figures, fabricated project outcomes, or personal data
were added. Existing server-rendered content and SEO are preserved. The newer
admin work on `main` was incorporated before release. The admin now has a
branded light shell and a private contact inbox. The contact chapter has its
own bounded sculpture space and a form that scrolls within the fixed viewport.
The editable content and inbox behavior are detailed in
`2026-09-30-content-and-admin.md`.

## Verification

- Frontend tests and production TypeScript/Vite build.
- Existing API suite in a disposable, memory-limited SDK container.
- Browser checks using the production bundle under the site's Content Security
  Policy: chapter navigation, document viewport bounds, full journey and project
  routes, English / Arabic, mobile, intro refresh, and reduced motion.
- Browser errors checked, including direct entry to the animated journey.

The preview harness and screenshots are local review artifacts outside this
repository. Production is published by the existing GitHub Actions image build
and the selfhost deployment agent after a push to `main`.
