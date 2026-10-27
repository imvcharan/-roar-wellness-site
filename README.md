# Roar Wellness

Roar Wellness is a Next.js 15 site with a same-origin Node.js CMS API backed by SQLite. Public pages fetch published CMS data directly from the API, so publishing content does not require a frontend rebuild. The `/inner-pages/` archive is category-driven and supports Treatments, Therapy, Mental healthcare, Main pages, Blog, and additional categories created in the CMS.

## Run locally

Use Node.js 24 or newer. Configure the CMS administrator password and an independent random signing secret before opening the admin:

```powershell
$env:CMS_ADMIN_PASSWORD = "use-a-strong-unique-password"
$env:CMS_SESSION_SECRET = "use-a-random-secret-at-least-32-characters-long"
# Optional; defaults to admin@roarwellness.org
$env:CMS_ADMIN_EMAIL = "admin@example.org"
npm run dev
```

The CMS is at `/admin`; sign in at `/admin-login` with the configured email and password. The initial administrator is created when the database is first initialized with `CMS_ADMIN_PASSWORD`; changing that environment variable later does not reset an existing account. Use the dashboard to change passwords and manage additional accounts.

The SQLite database is created at `data/cms.sqlite` on first API use. Set `CMS_DATABASE_PATH` to a writable persistent path to change its location. Uploaded media is stored in `data/media` and served through `/api/media/:id`; set `CMS_MEDIA_DIRECTORY` to a writable persistent directory to change the storage location. Categories can be created and managed in the dashboard; items are assigned by category rather than inferred from their URL slug.

## CMS features

- Create, edit, publish, schedule, preview, archive, and delete categorized content. Edit page slugs, SEO title, description, keywords, and robots directives for pages, services, and articles; Open Graph and Twitter tags use those values and the featured image. Changed published URLs permanently redirect to their latest URL. Drafts and archived entries are not exposed to public APIs. Updates retain revision snapshots that can be restored.
- Manage custom category names and slugs; built-in categories are protected. Manage client testimonials from the dedicated Testimonials page, including quote, optional image, ordering, and publish status. Manage team profiles from the Team page, including role badge, biography, profile image, display order, and publish status; published profiles appear on the homepage and the Our Team page. Homepage facility and approach cards, FAQ entries, site metadata, homepage copy, and contact information are managed separately.
- Upload and manage images from the media library. Images are validated and normalized to WebP.
- Admin, editor, and viewer roles have separate permissions. Only administrators can manage accounts, delete content/categories/homepage cards, edit global settings, and restore backups.
- Administrators can review appointment enquiries, assign them to staff, set follow-up dates, and search/filter/paginate the inbox. Staff activity is searchable and paginated, including sampled failed sign-in events. Analytics provides 7-, 30-, and 90-day consent-based anonymous totals and period comparisons. Enquiry records contain name, email, phone, source, workflow status, assignment, and follow-up date; they expire after 12 months. The appointment form does not request a health history or free-text message. Do not add clinical notes to the enquiries inbox. Serve the production site over HTTPS and restrict the SQLite file and persistent storage to the application account.
- Visitor page-view and appointment conversion analytics are recorded only after an explicit opt-in. Analytics events contain a public page path and timestamp only; they do not store IP addresses, precise location, referrers, or visitor identifiers and expire after 12 months. Staff activity logs also expire after 12 months. Approximate staff location is not collected unless `CMS_TRUSTED_GEO_PROVIDER` is explicitly set to `vercel` or `cloudflare` behind that provider's trusted proxy.
- Staff sessions expire after eight hours. Account holders can review and revoke their other active sessions from Security. The session list intentionally does not identify a device or retain IP address.
- Each CMS account can enable authenticator-app TOTP on the Security page. Secrets are encrypted using a key derived from `CMS_SESSION_SECRET`; save the one-time recovery codes securely. Changing `CMS_SESSION_SECRET` invalidates existing sessions and makes configured TOTP secrets unreadable, so preserve that secret and keep an encrypted database backup.
- Download and restore a JSON backup (including media files, revision history, enquiries, staff activity, and anonymous analytics), or import a JSON legacy content export. User accounts, password hashes, and active sessions are deliberately excluded from backups.

Backups/restores replace CMS data and should be performed with care. A legacy import accepts exported JSON data; it does not connect to or migrate the separate PHP backend automatically. Export the PHP content first and review/import that JSON from Settings.

Version 2 full backups contain appointment enquiries (including contact details), analytics events, staff activity logs, content, and media. User accounts, password hashes, and active sessions are excluded. Automated backups use a consistent SQLite snapshot, gzip compression, and client-side AES-256-GCM encryption before upload to a private S3-compatible bucket. The encryption key is separate from the CMS secrets and the bucket. The job fails rather than publishing a fresh marker when a database/media read or upload fails. The freshness check downloads the latest object and verifies decryption and its backup structure; it does not replace periodic restoration into an isolated non-production CMS. Configure bucket versioning and lifecycle retention, restrict credentials to the backup prefix, and test an actual restore regularly. Decrypted JSON contains sensitive enquiry data: use a private directory and securely remove it after a restore.

Appointment submissions can send an internal SMTP alert after the enquiry is saved. Alerts contain only the submission time and a link to the authenticated CMS inbox, not the enquirer's contact details. When SMTP is configured, a SQLite outbox retries failed sends; run its processor periodically to deliver queued alerts. SMTP outages do not discard the enquiry. Without complete SMTP settings, enquiries continue to be saved but no alerts are queued, so administrators must monitor the inbox.

CMS image uploads accept JPEG, PNG, WebP, GIF, TIFF, and AVIF files up to 50 MB; uploads are normalized to WebP. Content editors can set featured-image alt text and a nine-point focal position, which is preserved in content revisions and backups and used by public detail pages, blog cards, and archive thumbnails. “Save & preview” saves the current draft before opening its real preview page.

The repository includes a published-content snapshot from the site's public WordPress REST API. On first database initialization, the CMS imports its 49 published pages and 40 published posts while preserving their WordPress slugs and SEO metadata. Main pages and service pages are assigned from the source page slug. WordPress posts remain in Blog unless their slugs are explicitly designated as service landing pages. Direct legacy page URLs redirect to `/inner-pages/?slug=<slug>` (retired therapy slugs go to the Therapy filter). To refresh the snapshot, run `npm run cms:sync-wordpress` and re-import the generated `data/wordpress-content.json` from Settings on an already initialized database. Public WordPress pages/posts only are available through the public API; unpublished drafts and private backend data require a separate authorized export.

Run `npm run build` to verify a production build, then `npm start` to serve it.

## Content API

- `GET /api/cms/categories` — list categories.
- `POST /api/cms/categories` and `DELETE /api/cms/categories/:id` — manage categories (CMS session required).
- `GET /api/cms/content` — list published content; filter with `?category=<slug>`.
- `GET /api/cms/content?all=1` — include drafts and archived items (CMS session required).
- `POST /api/cms/content`, `PUT /api/cms/content/:id`, and `DELETE /api/cms/content/:id` — manage content (CMS session required).
- Published content is also available from the existing `/api/content/pages` and `/api/content/services` URLs for site integrations.
- Published blog entries are available from `/api/content/blog`; homepage cards, FAQs, and site settings are available from `/api/content/home`, `/api/content/faqs`, and `/api/content/settings`.
- `GET /api/health` — no-store database and media-directory readiness check for external uptime monitoring. It does not expose off-site backup credentials or verify backup health; use `npm run cms:backup:check` for that.

Public content APIs return `Cache-Control: no-store`, so publishing or editing an item is reflected on the next frontend fetch. Rich-text HTML is sanitized before storage. Draft and archived content is never returned from public endpoints. Scheduled entries are published by the Node server when due (with a 30-second background check and a due-time check on reads).

## Deployment notes

SQLite and local media storage are suitable only for a single Node.js instance with durable writable storage. Persist both the database and the media directory configured by `CMS_MEDIA_DIRECTORY` (default `data/media`); do not use an ephemeral deployment filesystem or share a SQLite file between multiple server instances. For horizontal scaling, move the CMS data layer to a shared database and media to shared object storage before adding instances. Set the CMS secrets in the deployment environment; never expose them using a `NEXT_PUBLIC_` prefix. The app applies database-backed limits of eight CMS sign-in requests per account email per 15 minutes and three verified appointment submissions per email per 15 minutes; the identifiers are HMACed and raw emails/IP addresses are not stored in the rate-limit table. These limits are defense-in-depth, not substitutes for edge/platform-level limits, especially for CAPTCHA challenge issuance or distributed abuse. Configure deployment-level limits for `/api/cms/login`, `/api/appointment-captcha`, and `/api/appointment-requests`, plus external uptime monitoring against `/api/health` and checks for backup freshness. Audit-write failures are reported to server logs but do not roll back the admin action; the SQLite audit log is not immutable or independently stored. Live Hostinger rate limits, persistent-storage behavior, off-site backups, log retention, and alerting must be verified in the hosting account; they cannot be confirmed from this repository. The CMS does not automatically migrate data from the separate PHP backend: provide a JSON export to import legacy content.

### Scheduled backups and enquiry alerts

Configure the server-side variables in `.env.example` using the hosting provider's secret store. The backup encryption key must be a base64-encoded 32-byte random key. Store it separately from the bucket and application secrets; without it, encrypted backups cannot be restored. Retain old encryption keys for as long as backups encrypted with them are retained, and run a new backup immediately after key rotation. S3 access should be restricted to writing the configured prefix and reading its objects/pointer for verification. Keep the bucket private, enable object versioning where supported, and set a lifecycle retention policy appropriate for sensitive enquiry data. The scripts do not delete old backup objects.

Configure the hosting scheduler for these commands (only schedule notification processing after all SMTP settings are in place):

- Daily: `npm run cms:backup`
- Hourly: `npm run cms:backup:check`
- Every five minutes: `npm run cms:notifications:process`

Configure the hosting scheduler or external monitoring to alert on non-zero job exits. The backup check downloads and decrypts the latest backup and verifies its structure; it checks freshness against `CMS_BACKUP_MAX_AGE_HOURS` (default 26). Do not include that check on a public endpoint. The notification processor retries failed SMTP delivery with backoff, up to eight attempts. Investigate exhausted retries; after resolving the SMTP issue, run `npm run cms:notifications:retry-exhausted` to requeue them. The inbox remains the source of truth for contacting enquirers.

For a controlled restore, download the encrypted object from the private bucket and run `npm run cms:backup:decrypt -- <encrypted-file> <private-output.json>` on a trusted machine with the decryption key configured. The output is sensitive plaintext; restore it through Settings on a non-production CMS first, verify content, media, and enquiry data, and securely remove the plaintext file afterwards. Only restore to production after the staging restore succeeds and a fresh production backup has been verified.

### Hostinger Web App Hosting

Use a GitHub repository as the deployment source and select Node.js 24 or newer. The application build command is `npm ci && npm run build`; the start command is `npm start` (Next.js serves on the port supplied by the hosting platform). Configure these server-side environment variables in Hostinger before starting the app:

Inter is bundled with the application, so production builds do not need to download fonts from Google.

- `CMS_ADMIN_EMAIL` — initial admin email (optional; defaults to `admin@roarwellness.org`).
- `CMS_ADMIN_PASSWORD` — strong initial admin password; required when initializing a new CMS database.
- `CMS_SESSION_SECRET` — independent random secret of at least 32 characters.
- `CMS_DATABASE_PATH` — optional path to a SQLite file on persistent writable storage.
- `CMS_MEDIA_DIRECTORY` — optional directory on persistent writable storage for uploaded media.
- `CMS_BACKUP_ENCRYPTION_KEY`, `CMS_BACKUP_S3_BUCKET`, and `CMS_BACKUP_S3_REGION` — required for scheduled encrypted backups; optional `CMS_BACKUP_S3_ENDPOINT`, `CMS_BACKUP_S3_PREFIX`, and `CMS_BACKUP_S3_POINTER_KEY` configure S3-compatible destinations. Configure standard `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` credentials (and session token if applicable) with least-privilege access.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `ENQUIRY_ALERT_FROM`, and `ENQUIRY_ALERT_TO` — configure SMTP-based enquiry alerts; `SMTP_SECURE` and `CMS_PUBLIC_URL` are optional.

The database and uploaded files are not part of the Git repository. Ensure Hostinger keeps their configured paths across deployments and restarts. If the hosting plan does not provide durable storage for both paths, use external persistent database and media storage before relying on the CMS for production content. Use one application instance with SQLite. The app also applies database-backed limits to CMS sign-in attempts per account email and appointment submissions per email; these do not replace edge/platform-level limits, especially for CAPTCHA challenge issuance or distributed abuse. Configure deployment-level rate limiting for `/api/cms/login`, `/api/appointment-captcha`, and `/api/appointment-requests`, plus external uptime/database/storage monitoring. Live Hostinger rate limits, persistent-storage behavior, off-site backups, scheduler, and alerting must be verified in the hosting account; they cannot be confirmed from this repository. The workflow in `.github/workflows/ci.yml` runs tests, a TypeScript check, and a production build on pushes and pull requests to `main`; connect the repository and enable automatic deployment from `main` in Hostinger separately.
