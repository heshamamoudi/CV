# Base images pinned by digest (a tag can be moved under you). The .NET digests
# are the ones inviteQr runs in production; node was resolved on 2026-09-15.

FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:8.0@sha256:bb32ba3ba3ea36e38572d9d8db76fa15f7cbf722f3f886e06bca6d528bd4fba8 AS build
WORKDIR /src
COPY api/Profile.Api/Profile.Api.csproj api/Profile.Api/
COPY api/Profile.Api/packages.lock.json api/Profile.Api/
RUN dotnet restore api/Profile.Api/Profile.Api.csproj --locked-mode
COPY api/ api/
# strings.json is embedded into the API assembly from the web tree.
COPY web/src/i18n/strings.json web/src/i18n/strings.json
RUN dotnet publish api/Profile.Api/Profile.Api.csproj -c Release -o /app --no-restore
# The Vite build becomes static files, except index.html: it is the server's
# page template and must never be served raw (it holds unfilled placeholders).
COPY --from=web /web/dist /app/wwwroot
RUN mkdir -p /app/templates && mv /app/wwwroot/index.html /app/templates/page.html

FROM mcr.microsoft.com/dotnet/aspnet:8.0-jammy-chiseled-composite-extra@sha256:7a088c77c50392f9fd2745476e92f6e818680b5dda07037bdade94af5198626a AS final
WORKDIR /app
# Root-owned on purpose: the app user can read and run its binaries but not
# change them, even if the filesystem were ever mounted writable.
COPY --from=build /app .
USER 1654
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["dotnet", "/app/Profile.Api.dll", "--healthcheck"]
ENTRYPOINT ["dotnet", "Profile.Api.dll"]
