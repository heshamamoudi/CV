# Content, contact, and admin

The public chapters use the editable profile, journey, technology, credentials,
and project records returned by `/api/public/{lang}/home`. Profile text and the
portrait appear in the introduction and About chapter; journey roles and
technologies also supply the labels on the 3D sculpture. The CV link appears
only when a CV exists in the requested language. Project records keep their
existing editorial copy and routes.

`CvContentRefresh` applies the bilingual September 2026 CV editorial revision
once, after the original seed. The `ContentRevisions` marker prevents later
startup runs from overwriting owner edits. Each profile language is updated
only if it still matches the original seed; journey highlights are updated only
when the original collection is intact. The revision does not change projects,
contact details, identity, or media.

The contact form posts a name, email, subject, message, language, honeypot, and
request ID to `/api/public/contact`. Validation bounds the fields to 120, 200,
160, and 4000 characters. Same-origin enforcement, a 24 KB body limit, and a
global limit of ten submissions per minute protect the endpoint. Repeating a
request ID receives the same receipt without storing a second message. The form
keeps the draft on errors and reuses the ID only when the submitted text has not
changed. Messages are stored in the database; no outgoing email is sent.

The authenticated `/admin/messages` inbox supports status filters, case
insensitive search, 20-item pages, read/new/archive status, mailto reply, and
confirmed deletion. Opening a new message marks it read. Admin responses are
uncached. A daily background job deletes messages older than the configured
retention period, which defaults to 180 days and is bounded to 30–3650 days.

The browser tab title is the English profile name, `Hesham Amoudi` by default,
on every public language and route. The separate admin SEO title and description
fields continue to control search metadata, including the social sharing title.

`ProjectEditorialRefresh` and `LegacyProjectCleanup` use separate one-time
`ContentRevisions` markers. The portfolio now publishes only Selfhost and InviteQR.
The cleanup removes the five original CV placeholders (`kaia-external-website`,
`airport-process-automation`, `safety-management-system`,
`hajj-1445-operations-modules`, and `hajj-1444-centers-performance`) after the
earlier editorial refresh. It leaves other owner projects, media, contact messages,
and inbox records alone. Requests for those retired project URLs redirect to the
matching language's projects page; an active project slug still resolves normally.
The cleanup marker prevents later seed runs from recreating retired projects.

`ProjectDemoMediaRefresh` stores the reviewed Selfhost and InviteQR UI captures as
ordinary `Media` and `MediaRendition` rows and associates them through each
project's persisted `CoverMediaId`. The localized image text identifies them as
demonstration workspaces. Owners can replace or clear a cover in the project
editor; the one-time media marker prevents a later seed run from restoring the
original association. Renditions are embedded source assets, so no screenshot URL
or runtime network fetch participates in publishing.

Project URLs remain optional HTTP(S) fields; the public detail page renders only
valid saved links. The admin editorial checklist reports missing bilingual bodies,
technologies, and cover image without changing publish visibility.

Selfhost copy was checked against `D:/selfhost/apps/control/README.md`,
`D:/selfhost/docs/00-platform.md`, and `D:/selfhost/docs/08-ci-cd.md`.
InviteQR copy was checked against `D:/inviteqr/docs/2026-08-25-inviteqr-design.md`,
`D:/inviteqr/src/InviteQr/InviteQr.csproj`, and its guest export implementation.
The public cases do not claim unmeasured outcomes or QR invitations.
