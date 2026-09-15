# heshamamoudi.com

Bilingual profile site. ASP.NET Core 8 (`api/`) + React (`web/`), one container.
Design: `docs/2026-09-15-profile-design.md`. Plans: `docs/plans/`.

Run the tests exactly as CI does:

    MSYS_NO_PATHCONV=1 docker run --rm -v "D:/cv:/src" -w /src mcr.microsoft.com/dotnet/sdk:8.0 dotnet test tests/Profile.Api.Tests
    MSYS_NO_PATHCONV=1 docker run --rm -v "D:/cv:/src" -w /src/web node:22-alpine sh -c "npm ci && npm test"
