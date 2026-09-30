# heshamamoudi.com

Bilingual profile site. ASP.NET Core 8 (`api/`) + React (`web/`), one container.
Public design: `docs/2026-09-30-immersive-design.md`. Backend/admin design:
`docs/2026-09-15-profile-design.md`. Plans: `docs/plans/`.

The public site is an animated, bilingual experience with five fixed-screen
chapters, a context-sensitive 3D sculpture, a scatter opening, and a custom vector
identity. Scroll, swipe, keyboard, and chapter buttons navigate the experience.
The complete journey and project pages use the same design. Motion is optional;
the content remains available when WebGL is unavailable.

The contact chapter accepts messages into a private admin inbox. The CV-based
editorial refresh, editable public fields, inbox workflow, retention, and title
behavior are documented in `docs/2026-09-30-content-and-admin.md`.

Run the tests exactly as CI does:

    docker run --rm -v "D:/selfhost/apps/portfolio/src:/src" -w /src mcr.microsoft.com/dotnet/sdk:8.0 dotnet test tests/Profile.Api.Tests
    cd web && npm test && npm run build
