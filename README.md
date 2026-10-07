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
- Manage category names and slugs, homepage team/testimonial/facility/approach cards, FAQ entries, site metadata, homepage copy, and contact information.
- Upload and manage images from the media library. Images are validated and normalized to WebP.
- Admin, editor, and viewer roles have separate permissions. Only administrators can manage accounts, delete content/categories/homepage cards, edit global settings, and restore backups.
- Download and restore a JSON content backup (including media files and revision history), or import a JSON legacy content export. User accounts, password hashes, and active sessions are deliberately excluded from backups.

Backups/restores replace CMS data and should be performed with care. A legacy import accepts exported JSON data; it does not connect to or migrate the separate PHP backend automatically. Export the PHP content first and review/import that JSON from Settings.

CMS image uploads accept JPEG, PNG, WebP, GIF, TIFF, and AVIF files up to 50 MB; uploads are normalized to WebP. Content editors can set featured-image alt text and a nine-point focal position, which is preserved in content revisions and backups and used by public detail pages, blog cards, and archive thumbnails. “Save & preview” saves the current draft before opening its real preview page.

The repository includes a published-content snapshot from the site's public WordPress REST API. On first database initialization, the CMS imports its 49 published pages and 40 published posts while preserving their WordPress slugs and SEO metadata. Main pages and service pages are assigned from the source page slug; service-related posts use the source WordPress categories and article title/slug to map into Treatments, Therapy, or Mental healthcare, while editorial recognition and success-story posts remain in Blog. Direct legacy page URLs redirect to `/inner-pages/?slug=<slug>` (retired therapy slugs go to the Therapy filter). To refresh the snapshot, run `npm run cms:sync-wordpress` and re-import the generated `data/wordpress-content.json` from Settings on an already initialized database. Public WordPress pages/posts only are available through the public API; unpublished drafts and private backend data require a separate authorized export.

Run `npm run build` to verify a production build, then `npm start` to serve it.

## Content API

- `GET /api/cms/categories` — list categories.
- `POST /api/cms/categories` and `DELETE /api/cms/categories/:id` — manage categories (CMS session required).
- `GET /api/cms/content` — list published content; filter with `?category=<slug>`.
- `GET /api/cms/content?all=1` — include drafts and archived items (CMS session required).
- `POST /api/cms/content`, `PUT /api/cms/content/:id`, and `DELETE /api/cms/content/:id` — manage content (CMS session required).
- Published content is also available from the existing `/api/content/pages` and `/api/content/services` URLs for site integrations.
- Published blog entries are available from `/api/content/blog`; homepage cards, FAQs, and site settings are available from `/api/content/home`, `/api/content/faqs`, and `/api/content/settings`.

Public content APIs return `Cache-Control: no-store`, so publishing or editing an item is reflected on the next frontend fetch. Rich-text HTML is sanitized before storage. Draft and archived content is never returned from public endpoints. Scheduled entries are published by the Node server when due (with a 30-second background check and a due-time check on reads).

## Deployment notes

SQLite and local media storage are suitable only for a single Node.js instance with durable writable storage. Persist both the database and the media directory configured by `CMS_MEDIA_DIRECTORY` (default `data/media`); do not use an ephemeral deployment filesystem or share a SQLite file between multiple server instances. For horizontal scaling, move the CMS data layer to a shared database and media to shared object storage before adding instances. Set the CMS secrets in the deployment environment; never expose them using a `NEXT_PUBLIC_` prefix. Add deployment-level rate limiting to `/admin-login`. The CMS does not automatically migrate data from the separate PHP backend: provide a JSON export to import legacy content.

### Hostinger Web App Hosting

Use a GitHub repository as the deployment source and select Node.js 24 or newer. The application build command is `npm ci && npm run build`; the start command is `npm start` (Next.js serves on the port supplied by the hosting platform). Configure these server-side environment variables in Hostinger before starting the app:

- `CMS_ADMIN_EMAIL` — initial admin email (optional; defaults to `admin@roarwellness.org`).
- `CMS_ADMIN_PASSWORD` — strong initial admin password; required when initializing a new CMS database.
- `CMS_SESSION_SECRET` — independent random secret of at least 32 characters.
- `CMS_DATABASE_PATH` — optional path to a SQLite file on persistent writable storage.
- `CMS_MEDIA_DIRECTORY` — optional directory on persistent writable storage for uploaded media.

The database and uploaded files are not part of the Git repository. Ensure Hostinger keeps their configured paths across deployments and restarts. If the hosting plan does not provide durable storage for both paths, use external persistent database and media storage before relying on the CMS for production content. Use one application instance with SQLite. The workflow in `.github/workflows/ci.yml` runs a production build on pushes and pull requests to `main`; connect the repository and enable automatic deployment from `main` in Hostinger separately.
