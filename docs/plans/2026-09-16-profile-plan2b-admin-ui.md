# heshamamoudi.com — Plan 2b: Admin screens

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The screens the owner actually uses: edit every piece of content in both languages, reorder it, upload images and CVs, set SEO, and see at a glance what is written in one language but not the other.

**Architecture:** A second React app in the same bundle, loaded lazily at `/admin/*`, talking to the Plan 2a admin API. The server already serves a signed-in-only shell page (`{"kind":"admin"}`) at every `/admin` path; `main.tsx` chooses the admin app for those pages. Images are resized **in the browser** to 640/1280/1920 WebP before upload — the server only checks signatures and size (Plan 2a decision; keeps the image decoder out of the container).

**Tech Stack:** React 18.3.1, react-router 7.18.4, Vite 7.3.6, Vitest 4.1.11, Testing Library. **No new dependencies.**

**Spec:** `docs/2026-09-15-profile-design.md` §5.3 (admin screens) and §5.2 (data model). **Previous plans:** `docs/plans/2026-09-15-profile.md`, `docs/plans/2026-09-15-profile-plan2a-admin-api.md`.

## Global Constraints

- Plan 1 and 2a constraints still hold. Server-rendered public HTML must not change.
- The admin chunk must be **lazily loaded**: a visitor to `/en` never downloads it. Prove it: `dist/assets/` gains a separate admin chunk, and the public entry chunk stays under 200 kB (it is ~189 kB today).
- Admin UI in both languages: a language toggle switches the interface (`en`/`ar`) and sets `dir` on `<html>`. Independent of which language's content is being edited — both content languages are always visible side by side.
- Every editable field shows the server's validation message for that exact field (`errors["headline.ar"]` → under the Arabic Headline box). Never a raw JSON dump.
- Unsaved changes: leaving a screen with unsaved edits asks first (in-app confirm plus `beforeunload`).
- Every destructive action (delete) confirms, naming the thing being deleted.
- No secret, token or email address is hard-coded in the web source.
- Accessibility: every input has a `<label>`; reorder works from the keyboard; `aria-live` for save results.
- Tests are Vitest + Testing Library with a fake `fetch`; every screen has at least one test that fails if the screen stops calling the right endpoint or stops showing a field error.

## Endpoint contract (already live, do not change the server)

| Screen | Endpoints |
|---|---|
| Dashboard | `GET /api/admin/completeness`, `GET /api/admin/me` |
| Profile | `GET/PUT /api/admin/profile` |
| Journey | `GET/POST /api/admin/journey`, `PUT/DELETE /api/admin/journey/{id}`, `PUT /api/admin/journey/order` |
| Projects | same shape at `/api/admin/projects` |
| Lists | same shape at `/api/admin/technologies`, `/certificates`, `/education`, `/languages` |
| Media | `GET/POST /api/admin/media`, `PUT/DELETE /api/admin/media/{id}`, public `/media/{id:N}/{width}.{webp\|jpg}` |
| CV | `GET /api/admin/cv`, `PUT/DELETE /api/admin/cv/{lang}`, public `/{lang}/cv` |
| SEO | `GET /api/admin/seo`, `PUT /api/admin/seo/pages/{key}`, `PUT /api/admin/seo/settings` |

Validation failures are RFC 7807: `{"title":"One or more validation errors occurred.","status":400,"errors":{"field":["message"]}}`. `401` means the Access session expired. `403` means the request did not look same-origin. `409` on media delete means the image is in use.

---

### Task 1: Admin shell — entry, API client, layout, strings

**Files:**
- Create: `web/src/admin/AdminApp.tsx`, `web/src/admin/api.ts`, `web/src/admin/types.ts`, `web/src/admin/strings.ts`, `web/src/admin/useAdminLang.ts`, `web/src/admin/components/Shell.tsx`, `web/src/admin/admin.css`
- Modify: `web/src/main.tsx`
- Test: `web/src/admin/api.test.ts`, `web/src/admin/AdminApp.test.tsx`

**Interfaces:**
- Produces:
  - `api<T>(path: string, init?: { method?: string; body?: unknown; form?: FormData; signal?: AbortSignal }): Promise<T>` — throws `ApiError`; `DELETE`/204 resolve to `undefined as T`.
  - `class ApiError extends Error { status: number; errors: Record<string, string[]>; field(name: string): string | undefined }`
  - `useAdminLang(): { lang: 'en' | 'ar'; setLang(l: 'en' | 'ar'): void; t(key: AdminStringKey): string }`
  - `<Shell>` — header with the site name, nav links (Dashboard, Profile, Journey, Projects, Lists, Media, CV, SEO), UI-language toggle, the signed-in email, a link to the public site, and `{children}`.
  - `AdminApp` default export, routed: `/admin`, `/admin/profile`, `/admin/journey`, `/admin/projects`, `/admin/lists`, `/admin/media`, `/admin/cv`, `/admin/seo`, anything else → a "not a page" panel with a link back.
  - `web/src/admin/types.ts`: TypeScript mirrors of the admin DTOs — `LocalizedText {en; ar}`, `ProfileEdit`, `JourneyItem`, `ProjectItem`, `TechnologyItem`, `CertificateItem`, `EducationItem`, `LanguageItem`, `MediaView`, `CvFileView`, `SeoView`, `CompletenessItem`.

- [ ] **Step 1: Write the failing tests**

`api.test.ts` asserts, with a stubbed `globalThis.fetch`:
1. `api('/api/admin/profile')` GETs that URL with `credentials: 'same-origin'` and `Accept: application/json`, and returns the parsed body.
2. A `PUT` with `body` sends `Content-Type: application/json` and the JSON text, and a 204 resolves to `undefined`.
3. A 400 validation problem throws `ApiError` whose `field('headline.ar')` is the server's message and whose `status` is 400.
4. A 401 throws `ApiError` with `status === 401`.
5. `form` sends the `FormData` as-is and sets **no** `Content-Type` (the browser writes the multipart boundary).
6. A non-JSON error body still throws `ApiError` with the status and a readable message.

`AdminApp.test.tsx`:
1. Renders the dashboard route with the nav present and the signed-in email from a stubbed `/api/admin/me`.
2. A 401 from any screen shows a "your session expired" panel with a reload action, not a blank page.
3. Switching the UI language to Arabic sets `document.documentElement.dir` to `rtl` and shows Arabic nav text; the choice survives a remount (localStorage).

- [ ] **Step 2: Run them and watch them fail**

`MSYS_NO_PATHCONV=1 docker run --rm --memory 2g -v "D:/cv:/src" -w /src/web node:22-alpine sh -c "npm ci >/dev/null 2>&1 && npm test"` — expect failures for the missing modules.

- [ ] **Step 3: Implement**

`web/src/admin/api.ts`:
```ts
export class ApiError extends Error {
  constructor(readonly status: number, message: string, readonly errors: Record<string, string[]> = {}) {
    super(message);
  }
  /** The server's message for one field, e.g. "headline.ar". */
  field(name: string): string | undefined {
    return this.errors[name]?.[0];
  }
}

type Init = { method?: string; body?: unknown; form?: FormData; signal?: AbortSignal };

/**
 * Every admin call. Same-origin only: the Access cookie rides along and the
 * browser's own Origin/Sec-Fetch-Site headers are what the server checks.
 */
export async function api<T>(path: string, init: Init = {}): Promise<T> {
  const method = init.method ?? (init.body !== undefined || init.form ? 'POST' : 'GET');
  const reply = await fetch(path, {
    method,
    credentials: 'same-origin',
    signal: init.signal,
    headers: init.form ? { Accept: 'application/json' } : { Accept: 'application/json', ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
  });

  if (reply.status === 204 || reply.headers.get('Content-Length') === '0') {
    if (reply.ok) return undefined as T;
  }

  const text = await reply.text();
  let parsed: unknown = undefined;
  try { parsed = text ? JSON.parse(text) : undefined; } catch { /* not JSON: handled below */ }

  if (!reply.ok) {
    const problem = parsed as { title?: string; detail?: string; errors?: Record<string, string[]> } | undefined;
    throw new ApiError(reply.status, problem?.detail ?? problem?.title ?? `Request failed (${reply.status})`, problem?.errors ?? {});
  }
  return parsed as T;
}
```

`useAdminLang.ts`: a module-level value plus `useSyncExternalStore` (or a small context) so every component re-renders on change; reads `localStorage.getItem('admin-lang')` inside `try/catch` (private mode throws), defaults to `en`; an effect sets `document.documentElement.lang` and `dir`.

`strings.ts`: `export const adminStrings = { en: {...}, ar: {...} } as const` with a key per label used anywhere in admin (`nav.dashboard`, `action.save`, `action.cancel`, `action.delete`, `action.add`, `state.saved`, `state.unsaved`, `state.saving`, `error.session`, `error.generic`, `field.english`, `field.arabic`, …). `export type AdminStringKey = keyof typeof adminStrings.en;` Both language objects must have identical keys — add a test that asserts that.

`Shell.tsx`: semantic `<header><nav>` with `NavLink`s, an `aria-live="polite"` region for save results, and `<main>`.

`AdminApp.tsx`: `Routes` for the screens (later tasks import their screens here), an error boundary that turns an unexpected throw into a readable panel, and a `session expired` panel when any screen throws `ApiError` with status 401.

`main.tsx`: choose the app by the embedded page data, lazily:
```tsx
const admin = readEmbedded()?.kind === 'admin';
const Root = admin ? lazy(() => import('./admin/AdminApp')) : null;
```
Render `<Suspense fallback={null}><Root /></Suspense>` for admin, the existing `<App />` otherwise. The public path must not import anything under `admin/`.

`admin.css`: imported by `AdminApp` only (so it lands in the admin chunk). Dark like the public site, but a plain working surface: a 2-column form grid that collapses to one column under 48rem, `.en`/`.ar` field pair, `input,textarea{inline-size:100%}`, error text in `--danger:#ff8f8f`, `dir` handled by the document.

- [ ] **Step 4: Tests pass, and the admin chunk is separate**

Run the web tests, then `npm run build` and confirm: a separate `dist/assets/AdminApp-*.js`, and the entry chunk still under 200 kB.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Admin shell: lazy admin app, API client, bilingual interface"
```

---

### Task 2: Field primitives and the save bar

**Files:**
- Create: `web/src/admin/components/Field.tsx`, `web/src/admin/components/LocalizedField.tsx`, `web/src/admin/components/SaveBar.tsx`, `web/src/admin/components/Confirm.tsx`, `web/src/admin/components/OrderableList.tsx`, `web/src/admin/useEditor.ts`
- Test: `web/src/admin/components/fields.test.tsx`, `web/src/admin/useEditor.test.tsx`

**Interfaces:**
- Produces:
  - `<Field label id error children />` — label, control, and the error message (`role="alert"`, tied to the input with `aria-describedby`, input gets `aria-invalid`).
  - `<TextInput id value onChange error label dir? maxLength? />`, `<TextArea …rows>`, `<NumberInput>`, `<DateInput>` (`type="date"`, value `yyyy-MM-dd`), `<Toggle label checked onChange>`.
  - `<LocalizedField name label value onChange error multiline? rows? maxLength? />` — one row with an English box (`dir="ltr"`) and an Arabic box (`dir="rtl"`, `lang="ar"`), each labelled, each showing `error(`${name}.en`)` / `error(`${name}.ar`)`.
  - `<SaveBar dirty saving savedAt error onSave onReset />` — sticky bar: state text from `strings`, a Save button disabled unless dirty, a Reset button, and a summary of any error not attached to a field.
  - `<Confirm question confirmLabel onConfirm>{trigger}</Confirm>` — inline confirmation (no `window.confirm`; it cannot be tested or styled).
  - `<OrderableList items renderItem onReorder>` — up/down buttons with `aria-label`s, plus native HTML5 drag (`draggable`, `onDragStart/onDragOver/onDrop`), calling `onReorder(orderedIds)`.
  - `useEditor<T>(loaded: T | null)` → `{ value, set, dirty, reset, replace }` plus a `useUnsavedGuard(dirty)` hook that registers `beforeunload` and blocks in-app navigation (react-router `useBlocker`).

- [ ] **Step 1: Failing tests**

`fields.test.tsx`:
1. `LocalizedField` renders two labelled boxes; typing in the Arabic one calls `onChange` with `{en, ar}` and the Arabic box has `dir="rtl"`.
2. A field error is shown, `aria-invalid="true"` is set, and the message is linked with `aria-describedby`.
3. `SaveBar` disables Save until `dirty`, shows the saving state, and shows a non-field error.
4. `Confirm` asks before acting: `onConfirm` is not called until the confirm button is pressed.
5. `OrderableList` moves an item down with the button and reports the new order; the moved item keeps keyboard focus.

`useEditor.test.tsx`: editing marks dirty, reset restores, `replace` (after a save) clears dirty, and `useUnsavedGuard` registers/removes `beforeunload`.

- [ ] **Step 2: Watch them fail. Step 3: Implement. Step 4: Tests pass.**

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Admin form primitives: bilingual fields, save bar, reorder, confirm"
```

---

### Task 3: Dashboard

**Files:** Create `web/src/admin/screens/DashboardScreen.tsx`, `web/src/admin/screens/DashboardScreen.test.tsx`; modify `AdminApp.tsx`.

**Behaviour:**
- Loads `GET /api/admin/completeness` and `GET /api/admin/me`.
- When the list is empty: a clear "everything is written in both languages" state.
- Otherwise groups items by `area`, shows each item's `label` and the missing fields in plain words ("Arabic title", "English highlight 2"), and links to the screen that fixes it (`journey` → `/admin/journey`, and where the screen supports it, `?id=` so the screen opens that item).
- Also shows: counts per area, and a link to the public site in each language.
- Errors: a failed load shows a message with a retry button.

**Tests:** empty state; grouped items with a working link; retry after a failed load re-requests.

- [ ] Commit: `Admin dashboard: what is still missing in one language`

---

### Task 4: Profile & Hero screen

**Files:** Create `web/src/admin/screens/ProfileScreen.tsx` + test; modify `AdminApp.tsx`.

**Behaviour:**
- `GET /api/admin/profile` into `useEditor`; every localized field as `LocalizedField` (name, headline, eyebrow, heroTitle, heroSubtitle, summary (multiline), location, about (multiline), quote); plain fields for email, linkedInUrl, gitHubUrl.
- Hero image and portrait: `<MediaPicker>` from Task 8 — until Task 8 lands, a plain read-only id with a "choose in Media" link; the final version uses the picker. (Wire the picker in the Media task, not here.)
- `PUT` on save; on 400, field errors appear under the right boxes and nothing is lost; on success the save bar says saved and `dirty` clears.
- Unsaved-changes guard on leaving.

**Tests:** loads and shows Arabic values; editing then saving PUTs exactly the edited payload; a 400 shows the message under the Arabic headline and keeps the edit; leaving while dirty asks first.

- [ ] Commit: `Admin profile screen`

---

### Task 5: Journey screen

**Files:** Create `web/src/admin/screens/JourneyScreen.tsx` + test; modify `AdminApp.tsx`.

**Behaviour:**
- List of entries in `sortOrder`, each showing title (interface language falls back to the other), organisation, dates, `Visible` state, and whether it is complete in both languages.
- `OrderableList` reorder → `PUT /api/admin/journey/order` with every id; failure restores the previous order and shows why.
- Editor for one entry (inline panel or `?id=`): localized title/organisation/summary; highlights as an ordered list of `LocalizedField`s with add/remove/reorder; `startDate`, `endDate` (empty = present, sent as `null`); `kind` (main/additional); `seniority` 1–5; `visible`.
- Create (`POST`) and delete (`DELETE`, via `Confirm`).
- Field errors including indexed ones (`highlights[1].ar`) land on the right highlight.

**Tests:** list order; reorder call and rollback on failure; add a highlight and save the right JSON; `highlights[1].ar` error shown on the second highlight's Arabic box; delete confirms first; empty `endDate` sends `null`.

- [ ] Commit: `Admin journey screen with reordering and highlights`

---

### Task 6: Projects screen

**Files:** Create `web/src/admin/screens/ProjectsScreen.tsx` + test; modify `AdminApp.tsx`.

**Behaviour:**
- List with slug, featured and visible state, reorder as in Task 5.
- Editor: slug (with a hint that changing it keeps the old address working via a redirect), localized title/summary/body (multiline), technologies as a chip editor (type, Enter adds; ≤30, each ≤40 characters), `featured` (a toggle that explains only one project can be featured), `visible`, cover image (picker, Task 8).
- Create/delete/save as Task 5.

**Tests:** slug error from the server shown under the slug box; technologies round-trip as an array; featuring one project shows the "only one" note; delete confirms.

- [ ] Commit: `Admin projects screen`

---

### Task 7: Lists screen (technologies, certificates, education, languages)

**Files:** Create `web/src/admin/screens/ListsScreen.tsx` + test; modify `AdminApp.tsx`.

**Behaviour:** One screen, four tabs (`?list=technologies` etc. so a link can open a tab). Each tab is a small table of rows editable in place, with add, delete (confirm) and reorder, using the same primitives:
- technologies: `name` + localized `category`
- certificates: localized `title`, `issuer`, `issuedOn` (date)
- education: localized `degree`, `institution`
- languages: localized `name`, `level`

**Tests:** switching tab changes the endpoint used; adding a row POSTs and shows it; a field error appears on the row that caused it; reorder sends every id.

- [ ] Commit: `Admin lists screen for technologies, certificates, education and languages`

---

### Task 8: Media library, browser-side resizing, and the picker

**Files:**
- Create: `web/src/admin/resize.ts`, `web/src/admin/screens/MediaScreen.tsx`, `web/src/admin/components/MediaPicker.tsx`, tests for each
- Modify: `AdminApp.tsx`, `ProfileScreen.tsx` and `ProjectsScreen.tsx` (use the picker)

**Interfaces:**
- `resizeForUpload(file: File): Promise<{ width: number; height: number; type: 'image/webp' | 'image/jpeg'; renditions: { width: number; blob: Blob }[] }>`
  - Rejects anything whose type is not `image/*`, and anything over 25 MB, with a readable message.
  - Reads natural size with `createImageBitmap` (fall back to an `<img>` + `decode()`).
  - Target widths: 640, 1280, 1920 — only those `<= natural width`; if the image is narrower than 640, one rendition at its natural width is still sent as `w640`.
  - Draws to a canvas at each width (aspect preserved, `imageSmoothingQuality: 'high'`) and encodes with `canvas.toBlob(…, 'image/webp', 0.82)`; if the result is `null` or not WebP (older Safari), re-encodes as `image/jpeg` 0.85 and returns that type for **all** renditions (one type per image).
  - Every rendition must be under 3 MB (the server's cap); if one is larger, re-encode that width at 0.7, then 0.6, then fail with a message naming the width.

**MediaScreen behaviour:** upload (file input plus drop zone) showing progress per file; the library as a grid of previews (`previewUrl`), each with its alt text in both languages (editable, `PUT`), its widths, and delete (confirm; a `409` says the image is in use and where to remove it first).

**MediaPicker behaviour:** `<MediaPicker value onChange label />` — shows the current image (or "none"), opens a dialog listing the library, and sets the id. Also clears to `null`.

**Tests (jsdom has no canvas encoder, so stub it):**
- `resize.test.ts`: stubs `createImageBitmap` and `HTMLCanvasElement.prototype.toBlob`; asserts the widths chosen for a 1600 px image (640, 1280 only), a 500 px image (one `w640`), the JPEG fallback when WebP comes back `null`, the 25 MB and non-image refusals, and the quality retry when a blob exceeds 3 MB.
- `MediaScreen.test.tsx`: an upload POSTs a `FormData` carrying `fileName`, `width`, `height`, `altEn`, `altAr` and the `w*` files; alt editing PUTs; delete confirms and a 409 shows the in-use message.
- `MediaPicker.test.tsx`: choosing an image reports its id; clearing reports `null`.

- [ ] Commit: `Admin media library with browser-side WebP renditions`

---

### Task 9: CV files and SEO & settings screens

**Files:** Create `web/src/admin/screens/CvScreen.tsx`, `web/src/admin/screens/SeoScreen.tsx`, tests; modify `AdminApp.tsx`.

**CV behaviour:** one row per language showing file name, size (in KB/MB), uploaded date, a link that opens `/{lang}/cv`, replace (file input, PDF only, ≤10 MB — checked in the browser with a clear message before the request) and delete (confirm). States which language falls back to which when one is missing.

**SEO behaviour:** three page sections (home, journey, projects) each with localized title (≤70) and description (≤200) and a share-image picker, with a note that empty means "use the page's own text"; then settings: GA measurement id, GA property id, Search Console token, notification email, message retention days, each saving through `PUT /api/admin/seo/settings` with server errors shown per field. Include a short hint under each analytics field about where the value comes from (GA4 admin → data streams), since Plan 5 needs them.

**Tests:** CV: a non-PDF is refused before any request; a successful upload re-reads the list. SEO: a bad measurement id shows the server's message under that field; saving a page override PUTs to `/api/admin/seo/pages/home`.

- [ ] Commit: `Admin CV and SEO screens`

---

### Task 10: Verify, review, deploy

- [ ] **Step 1: Full checks**

```bash
cd /d/cv
MSYS_NO_PATHCONV=1 docker run --rm --memory 3g --cpus 2 -v "D:/cv:/src" -w /src mcr.microsoft.com/dotnet/sdk:8.0 dotnet test tests/Profile.Api.Tests --nologo -v minimal
MSYS_NO_PATHCONV=1 docker run --rm --memory 2g -v "D:/cv:/src" -w /src/web node:22-alpine sh -c "npm ci >/dev/null 2>&1 && npm test && npm run build && npm audit | tail -1"
docker build -q -t cv:plan2b . && MSYS_NO_PATHCONV=1 docker run --rm --memory 2g -v /var/run/docker.sock:/var/run/docker.sock -v selfhost_trivy:/root/.cache/trivy aquasec/trivy:0.74.0@sha256:62b1e65e8869bc4b4c6aa4fa2b21595256c7c2f6018a9d9ad61caf87187c1969 image --quiet --scanners vuln,secret --severity CRITICAL,HIGH,MEDIUM cv:plan2b
```
Expected: all tests pass, 0 vulnerabilities, Trivy clean, public entry chunk under 200 kB with a separate admin chunk.

- [ ] **Step 2: Run the built image against a throwaway Postgres and check the public site is unchanged** (`/en`, `/ar`, `/en/journey`, `/en/projects/{slug}` all 200 and still carrying their server-rendered text; `/admin` still 401 without a token).

- [ ] **Step 3: Fable review** of the whole plan's diff: XSS through admin-entered content rendered in admin, token/session handling, the resize path, unsaved-data loss, any public bundle growth, vacuous tests. Fix CRITICAL/HIGH, re-run Step 1.

- [ ] **Step 4: Push; the panel auto-deploys.** Then the owner signs in at `https://heshamamoudi.com/admin`, checks the dashboard, edits one field, uploads one image, and confirms the public page shows it.
