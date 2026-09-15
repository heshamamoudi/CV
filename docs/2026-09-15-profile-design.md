# heshamamoudi.com — design

Status: **agreed in conversation 2026-09-15, awaiting review of this document.**
Owner: Hesham Amoudi. Replaces the existing Create React App + Firebase CV in this repository.

---

## 1. What it is

A bilingual (English / Arabic) personal profile site at **heshamamoudi.com**, with:

- a public site built to rank well and share well, with real 3D scenes (React Three Fiber) where they carry meaning;
- an admin panel at `/admin` where every piece of content is edited and stored in PostgreSQL;
- a contact form that actually delivers;
- Google Analytics 4 with consent, **and an analytics dashboard inside the admin panel** — top pages, navigation paths and a behaviour funnel read back from GA4;
- deployment through the selfhost control panel, like inviteQr.

Visual direction: the dark architectural mockup supplied on 2026-09-15 (hero over a Riyadh skyline at dusk, isometric journey, glass architecture diagram, technology orbit, light "About" section, dark contact footer).

### Non-goals

- No blog, no comments, no multi-user admin, no public accounts.
- No payment, no newsletter.
- No self-hosted analytics alongside GA4 (GA4 was chosen explicitly).
- Not static hosting: content lives in a database, so the site runs on the platform.

---

## 2. Architecture

One repository, **one container, one image**.

```
CV/
  api/        ASP.NET Core 8 — public content API, admin API, SEO renderer, static file host
  web/        React 18 + TypeScript + Vite — public site and /admin (separate lazy chunk)
  tests/      api tests (xUnit), web tests (Vitest), end-to-end (Playwright)
  Dockerfile  multi-stage: build web → publish api → aspnet runtime serving both
  .env.example
  .github/workflows/build.yml   test → build → push ghcr.io/heshamamoudi/cv
```

### 2.1 Runtime

| Concern | Decision |
|---|---|
| Server | ASP.NET Core 8, listening on `0.0.0.0:8080`, non-root, read-only root filesystem |
| Data | PostgreSQL via the panel's *Give it a database*; EF Core 8 + Npgsql, migrations applied at startup with retry |
| Database resilience | Same retrying execution strategy as inviteQr (`InviteQrRetryingStrategy`: Npgsql transient errors **plus** bare `SocketException`, 6 attempts, delay capped at 5 s) — the lesson of 2026-09-13 |
| Files | Uploaded images and CV PDFs stored in the database (`bytea`), served with long-lived cache headers keyed by content hash. Keeps the container read-only |
| Images | Resized on upload into a small set of widths and encoded to WebP plus a JPEG fallback (SkiaSharp, MIT licence) |
| Front end | React 18, TypeScript, Vite, React Router, React Three Fiber + drei, Framer Motion, Tailwind CSS using logical properties for RTL |
| Admin chunk | `/admin` code is split into its own lazy bundle; public visitors never download it |

### 2.2 Request flow

```
Visitor ──► Cloudflare ──► cloudflared ──► cv:8080
                                             │
              /api/public/*   ─────────────► content API (read-only, cached)
              /api/contact    ─────────────► contact endpoint (rate-limited)
              /api/admin/*    ─ Access JWT ► admin API
              /admin/*        ─ Access JWT ► SPA shell (admin chunk)
              /sitemap.xml, /robots.txt ───► generated from the database
              /media/{hash}   ─────────────► image / PDF bytes
              /{en|ar}/...    ─────────────► SEO renderer → HTML with real content + embedded JSON → React takes over
```

---

## 3. Public site

### 3.1 Routes (both `/en` and `/ar`)

| Route | Content |
|---|---|
| `/` | Redirects to `/en` or `/ar` from `Accept-Language` (302, `Vary: Accept-Language`); `x-default` points at `/en` |
| `/{lang}` | Home: Hero → Journey → Featured project → Technologies → About → Contact |
| `/{lang}/journey` | Full career timeline |
| `/{lang}/projects` | All projects |
| `/{lang}/projects/{slug}` | One project |
| `/{lang}/cv` | Downloads the CV PDF for that language (falls back to the other language's file, never 404 while one exists) |
| unknown | 404 page in the visitor's language, real 404 status |

### 3.2 Sections

**01 Hero.** Eyebrow, headline, sub-headline, two calls to action (Explore my work, Download CV), section counter "01 / 05", location. Background is an image uploaded in admin (a real photograph or an AI-generated image supplied by the owner — this project does not produce photographic artwork). Until one is uploaded: a built-in low-poly Riyadh dusk scene.

**02 Journey — 3D.** Each journey entry becomes an isometric building on a glowing path; building height grows with seniority. Hover or tap shows title, organisation, dates and highlights. Mobile: vertical timeline.

**03 Featured project — 3D.** The featured project's architecture rendered as glass nodes with light pulses travelling along links. Rotate / zoom / details controls. Nodes and links are data (see 5.2).

**04 Technologies — 3D.** Glass tiles orbiting a core, category list beside it.

**05 About.** Light section: portrait, about text, three traits, Download CV, handwritten quote.

**Contact / footer.** Email, LinkedIn, GitHub from the database; working contact form.

### 3.3 3D and performance rules

- Text and the hero image render first. Each 3D scene is its own lazy chunk, mounted when its section nears the viewport (`IntersectionObserver`).
- Static fallback images of each scene for: `prefers-reduced-motion`, no WebGL, and low-capability devices (hardware concurrency / device memory heuristics, mobile by default).
- Frame loop paused when a scene is off-screen or the tab is hidden.
- Budgets enforced in CI (section 8): Lighthouse **Performance ≥ 90, SEO = 100, Accessibility ≥ 95, Best Practices ≥ 95** on the mobile profile for `/en` and `/ar`.

---

## 4. SEO

### 4.1 Server-rendered content, React enhancement

Many crawlers and every link-preview bot (LinkedIn, WhatsApp, X, Slack, Bing) read only the HTML the server returns. So for every public route the API renders:

- the **same text content a visitor sees** — name, headline, summary, journey, projects, technologies, contact — as semantic HTML (`h1`–`h3`, `ol`, `article`, `address`) styled with the site's CSS, so the first paint is real content, not a spinner;
- the page data as embedded JSON (`<script type="application/json" id="page-data">`), so React renders immediately without a second request;
- all head tags (4.2).

React then mounts over the same markup and adds interaction and 3D. The server HTML and the React output come from the same data, so crawlers and visitors see the same content (no cloaking).

### 4.2 Head and discovery

| Item | Implementation |
|---|---|
| Title, description | Per page and language, editable in admin; sensible defaults generated from content |
| Canonical | Absolute `https://heshamamoudi.com/{lang}/...`, no trailing-slash duplicates |
| hreflang | `en`, `ar`, `x-default` on every page |
| `lang` / `dir` | `<html lang="ar" dir="rtl">` on Arabic pages |
| Open Graph / Twitter Card | Title, description, share image (uploaded, 1200×630), locale and alternate locale |
| JSON-LD | `ProfilePage` with a `Person` (name, jobTitle, worksFor, alumniOf, knowsAbout, sameAs LinkedIn/GitHub), `BreadcrumbList` on sub-pages, `CreativeWork` on project pages |
| sitemap.xml | Generated from the database, both languages, with `xhtml:link` alternates and `lastmod` from content updates |
| robots.txt | Allows the public site, disallows `/admin` and `/api/admin`, points at the sitemap |
| Search Console | Verification meta tag value set in admin |
| Canonical host | `www.heshamamoudi.com` → 301 → `heshamamoudi.com`; HTTPS only (Cloudflare) |
| Status codes | Real 404s; project slugs changed in admin keep a 301 from the old slug |
| Speed | Brotli, immutable caching for hashed assets, preloaded fonts subset for Latin and Arabic, responsive `srcset` images, no layout shift on font load |

---

## 5. Content and admin

### 5.1 Admin access — Cloudflare Access, same as the control panel

- A Cloudflare Access application covers **only** `heshamamoudi.com/admin*` and `heshamamoudi.com/api/admin*`, with the same identity method and allowed email as `admin.fikrahaive.com`.
- The API validates `Cf-Access-Jwt-Assertion` on **every** admin request — signature against the team's certificates, audience tag, expiry, and email against an allow-list — ported from `selfhost/apps/control/.../CloudflareAccess.cs`. A request reaching the container without a valid token is rejected even if Access were misconfigured.
- No passwords, no login page in the app. Admin state-changing requests additionally require a same-origin check.

### 5.2 Data model (every user-visible text field has `En` and `Ar`)

| Entity | Fields (abridged) |
|---|---|
| `Profile` (single row) | Name, Headline, Eyebrow, Summary, Location, Email, Phone (optional, hidden by default), LinkedIn, GitHub, HeroImage, Portrait, AboutText, Quote |
| `Trait` | Title, Subtitle, Icon, SortOrder |
| `JourneyEntry` | Title, Organisation, StartDate, EndDate (null = present), Summary, Highlights (list), Kind (`Main` / `Additional`), Seniority (1–5, drives building height), SortOrder, Visible |
| `Project` | Slug, Title, Summary, Body, Technologies, Images, Featured, SortOrder, Visible, `ArchitectureNodes` (id, label, icon, x/y/z), `ArchitectureLinks` (from, to, label) |
| `TechCategory` / `Technology` | Name, Icon (SVG upload), Category, SortOrder |
| `Certificate`, `Education`, `Language` | As on the CV |
| `Media` | Bytes per rendition, content type, hash, width/height, Alt, uploaded at |
| `CvFile` | Language, PDF bytes, uploaded at |
| `PageSeo` | Route key, Title, Description, ShareImage |
| `SiteSettings` (single row) | GA4 Measurement ID, GA4 property ID, Search Console token, contact notification email, message retention days |
| `ContactMessage` | Name, Email, Message, Language, received at, read at, IP hash (not the IP) |

Every change stamps `UpdatedAt`; the sitemap's `lastmod` and cache keys derive from it.

### 5.3 Admin screens (bilingual UI)

Dashboard · Analytics (section 6.3) · Profile & Hero · Journey (drag to reorder) · Projects (including the architecture editor) · Technologies · About & Traits · Certificates / Education / Languages · Media library · CV files · SEO & Settings · Messages.

**Completeness check:** any visible item missing its Arabic or English text is listed on the dashboard and flagged on its screen. The public site never silently shows English on an Arabic page — an untranslated item is hidden on that language until filled, and the dashboard says so.

### 5.4 Initial content

Seeded from `Hesham_Amoudi_2026-_CV.pdf` (English): ALTANFEETHI (Lead Application Development, Jul 2025–present); Jeddah Airports Company (Business Application Senior Specialist Sep 2024–Jul 2025, Senior Application Engineer Dec 2023–Sep 2024, Web Developer Nov 2022–Dec 2023); Alhalees Medical Center (Software Developer Jul–Nov 2022, Odoo Technical Backend Consultant Mar 2021–Aug 2022); Rakeen Hajj 2024 and Mashariq Hajj 2023 as additional experience; skills, certificates, education (BSc IT, King Abdulaziz University), languages. Arabic drafted for the owner's review. **GACA** to be added from details the owner supplies (not in the CV yet). Nothing is published until the owner has reviewed the seeded content in admin.

---

## 6. Analytics

### 6.1 Collection — correct by construction

- **GA4 via `gtag.js`, Consent Mode v2.** Defaults set *before* the tag loads: `analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization` all `denied`. The GA script is not requested at all until the visitor chooses; *Accept analytics* grants `analytics_storage` only (ads stay denied). The choice is remembered for 12 months and can be changed from a footer link.
- **Single-page-app page views done properly.** Automatic page views and enhanced-measurement history tracking are **disabled** (`send_page_view: false`, enhanced measurement "page changes based on browser history events" off in the GA property), and the router sends exactly **one** `page_view` per route change with `page_location`, `page_title`, `page_referrer` (the previous in-app route) and `language`. This avoids the two classic SPA errors: missing views after the first page, or every view counted twice.
- **Internal traffic excluded:** admin routes never load the tag; the owner can set an "internal" flag on their own browser from admin, sent as `traffic_type=internal` and filtered in the property.
- **Events** (names are fixed; parameters registered as custom dimensions):

| Event | When | Parameters |
|---|---|---|
| `page_view` | Route change (manual, above) | `language` |
| `section_view` | A home section is ≥ 50 % visible for ≥ 1 s, once per page view | `section` (`hero`, `journey`, `project`, `tech`, `about`, `contact`), `language` |
| `project_view` | Project page opened or featured project details expanded | `project_slug`, `language` |
| `cv_download` | CV link used | `language` |
| `contact_submit` | Contact form accepted by the server (not on click) | `language` |
| `language_switch` | Language toggle | `from`, `to` |
| `outbound_click` | LinkedIn / GitHub / email link | `destination` |

Custom dimensions (event scope) to register in the GA property: `section`, `project_slug`, `language`, `destination`, `from`, `to`, `traffic_type`. `contact_submit` and `cv_download` are marked as key events.

### 6.2 Reading the data back

- **Google Analytics Data API (v1)** with a **service account** granted *Viewer* on the GA4 property. Credentials: service-account JSON supplied as an environment secret (`GoogleAnalytics__ServiceAccountJson`, base64), never in the repository or database.
- Calls are made server-side only, from the admin API. Results are cached for 15 minutes to stay well inside quota.
- Funnels use `runFunnelReport` (Data API **v1alpha**). Because it is an alpha API, the funnel is isolated behind one adapter with a contract test; if Google changes or withdraws it, the rest of the dashboard keeps working and the funnel panel says it is unavailable.

### 6.3 Admin analytics dashboard

Date range picker (7 / 28 / 90 days, custom), language filter (all / en / ar).

| Panel | Source |
|---|---|
| Overview | Active users, sessions, engaged sessions, average engagement time, key events |
| Most visited pages | `pagePath` × `screenPageViews`, `activeUsers`, grouped per language |
| Most viewed sections | `section_view` by `section` |
| Top projects | `project_view` by `project_slug` |
| Where visitors come from | `sessionSourceMedium`, `landingPage` |
| **Navigation paths** | `pageReferrer` → `pagePath` transitions within the site (top transitions, rendered as a flow diagram); external referrers grouped as "Entered from …" |
| **Behaviour funnel** | Open funnel: Landing → Journey section viewed → Project viewed → CV downloaded **or** Contact sent; shows users and drop-off per step |
| Audience | Country, device category, language |

**What the dashboard states on its face, so numbers are read correctly:**
- GA data for the current day is incomplete and can take up to 24–48 hours to settle.
- Only visitors who accepted analytics are counted.
- Small counts may be withheld by GA thresholds; the panel shows "not enough data" rather than zero.

### 6.4 Setup the owner performs once (guided step by step later)

1. Create the GA4 property and web data stream for `heshamamoudi.com`; paste the Measurement ID into admin.
2. Turn off *page changes based on browser history events* in enhanced measurement.
3. Register the custom dimensions and key events listed in 6.1.
4. Create a Google Cloud service account, enable the Analytics Data API, grant it *Viewer* on the property, and provide its key as the environment secret.

---

## 7. Contact form

- `POST /api/contact`: name (≤ 100), email (validated), message (10–2000), language; hidden honeypot field; per-IP rate limit (5 per hour) and a global limit; the anti-forgery token issued with the page.
- Stored in `ContactMessage` (IP stored only as a salted hash), shown in admin Messages, purged after the configured retention (default 180 days).
- Notification email via **Resend** from `noreply@heshamamoudi.com` to the configured address, reply-to set to the visitor. Requires Resend's DNS records (SPF, DKIM) on the domain. If sending fails, the message is still saved and the dashboard flags the failure.
- The visitor sees success only after the server has stored the message.

---

## 8. Testing

| Layer | What is proven |
|---|---|
| API (xUnit) | Public endpoints return only visible, complete-language content; admin endpoints reject missing, expired, wrong-audience and wrong-email Access tokens; SEO renderer output contains the real text, canonical, hreflang, JSON-LD and correct `lang`/`dir`; sitemap alternates; slug 301s; contact validation, honeypot and rate limit; analytics adapter maps API responses correctly (recorded fixtures); retrying strategy registered |
| Web (Vitest + Testing Library) | Components in both directions; consent defaults to denied and no GA request before consent; exactly one `page_view` per route change; section-view threshold logic; 3D fallback chosen under reduced motion / no WebGL |
| End to end (Playwright) | `/en` and `/ar` render with content before JavaScript; RTL layout; language switch keeps the page; contact form round-trip against a test database; `/admin` without a token is refused |
| Quality gate (Lighthouse CI) | Budgets in 3.3 on `/en` and `/ar`; a regression fails the build |

Guard tests follow the house rule: every "does not contain" style assertion also asserts it found something to check, and new guards are mutation-checked.

---

## 9. Build and deployment

- **Dockerfile**: pinned-by-digest base images; Node stage builds `web/`; .NET SDK stage restores in locked mode and publishes `api/`; runtime stage `aspnet`, non-root user, `EXPOSE 8080`, `HEALTHCHECK`.
- **CI** (`.github/workflows/build.yml`, copied from the platform's reference workflow): tests (API, web, Playwright, Lighthouse) → build → push `ghcr.io/heshamamoudi/cv`; `:latest` only from `main`.
- **Panel**: connect the repository, slug `cv`, port 8080, database on, auto-deploy on, domain root `heshamamoudi.com` (www routed with it).
- **`.env.example`**: `ConnectionStrings__DefaultConnection`, `Site__BaseUrl`, `CloudflareAccess__TeamDomain`, `CloudflareAccess__Audience`, `CloudflareAccess__AllowedEmails`, `Email__ResendApiKey`, `Email__From`, `GoogleAnalytics__ServiceAccountJson`, `GoogleAnalytics__PropertyId`.
- **Go-live sequence**: runs first on a test subdomain under `fikrahaive.com` for the owner to check → owner approves → `heshamamoudi.com`. Fable reviews before each commit to `main`; nothing reaches production without the owner seeing it first.

### Prerequisites outside the code

1. `heshamamoudi.com` added to Cloudflare and nameservers switched at GoDaddy (in progress).
2. Cloudflare Access application for `/admin*` and `/api/admin*`.
3. Resend domain verification records.
4. GA4 property, custom dimensions, service account (6.4).
5. Hero image and portrait uploaded by the owner.
6. GACA role details.

---

## 10. Decisions log

| Decision | Chosen | Why |
|---|---|---|
| Front end | React + Three.js (R3F) | Owner's choice: real 3D and richer front-end capability |
| Topology | One container | One image, one deploy, one domain; no cross-origin API to secure |
| SEO for a React app | Server-rendered content + embedded data, React takes over | Link-preview bots and non-Google crawlers need real HTML; same data for both avoids cloaking |
| Admin auth | Cloudflare Access + per-request JWT validation | Same as the control panel; no passwords in the app |
| Languages | English and Arabic, separate URLs | Owner requirement; ranks in both languages |
| Files | In the database | Keeps the container read-only |
| Analytics | GA4 with Consent Mode v2, dashboard via Data API | Owner requirement; PDPL consent; numbers read correctly |
| Email | Resend | Already used by inviteQr, free tier |
| Old code | Firebase and CRA removed | Replaced; the committed Firebase web key should be deleted in the Firebase console |
