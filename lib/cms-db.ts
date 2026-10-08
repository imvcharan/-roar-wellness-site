import { mkdirSync } from "node:fs";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { homepageSeeds } from "@/lib/homepage-seed-data";
import { inferImportedCategorySlug, parseImportedContent } from "@/lib/cms-import-utils";
import { getCmsContentHref } from "@/lib/cms-routes";
import { normalizeCmsPlainText } from "@/lib/cms-text";

export interface CmsCategory {
  id: string;
  name: string;
  slug: string;
  is_default: number;
  created_at: string;
}

export interface CmsContent {
  id: string;
  title: string;
  slug: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  excerpt: string | null;
  summary: string | null;
  description: string | null;
  content: string | null;
  image_url: string | null;
  image_alt_text: string | null;
  image_position: string;
  status: "draft" | "published" | "archived";
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  seo_robots: string | null;
  scheduled_publish_at: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

type CmsGlobal = typeof globalThis & {
  roarCmsDatabase?: DatabaseSync;
  roarCmsPublishTimer?: NodeJS.Timeout;
};

const globalCms = globalThis as CmsGlobal;

function openDatabase(): DatabaseSync {
  const databasePath = resolve(
    process.env.CMS_DATABASE_PATH?.trim() || "data/cms.sqlite",
  );
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE IF NOT EXISTS content (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      excerpt TEXT,
      summary TEXT,
      description TEXT,
      content TEXT,
      image_url TEXT,
      image_alt_text TEXT,
      image_position TEXT NOT NULL DEFAULT '50% 50%',
      status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
      seo_title TEXT,
      seo_description TEXT,
      seo_keywords TEXT,
      seo_robots TEXT,
      scheduled_publish_at TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      published_at TEXT
    );
    CREATE TABLE IF NOT EXISTS cms_sessions (
      session_id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES cms_users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE IF NOT EXISTS cms_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE IF NOT EXISTS cms_revisions (
      id TEXT PRIMARY KEY,
      content_id TEXT NOT NULL,
      snapshot TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE IF NOT EXISTS cms_url_redirects (
      source_path TEXT PRIMARY KEY,
      content_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS cms_revisions_content_created
      ON cms_revisions(content_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS cms_media (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE IF NOT EXISTS cms_faqs (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE IF NOT EXISTS cms_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE IF NOT EXISTS cms_bootstrap_state (
      key TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE IF NOT EXISTS cms_home_sections (
      section_key TEXT PRIMARY KEY,
      group_name TEXT NOT NULL DEFAULT 'custom',
      heading TEXT NOT NULL,
      eyebrow TEXT,
      body TEXT,
      image_url TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS content_status_category_updated
      ON content(status, category_id, updated_at DESC);
  `);
  const addColumn = (table: string, column: string, definition: string) => {
    const columns = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!columns.some((item) => item.name === column)) {
      database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  };
  addColumn("content", "seo_title", "TEXT");
  addColumn("content", "image_alt_text", "TEXT");
  addColumn("content", "image_position", "TEXT NOT NULL DEFAULT '50% 50%'");
  addColumn("content", "seo_description", "TEXT");
  addColumn("content", "seo_keywords", "TEXT");
  addColumn("content", "seo_robots", "TEXT");
  addColumn("content", "scheduled_publish_at", "TEXT");
  addColumn("cms_sessions", "user_id", "TEXT REFERENCES cms_users(id) ON DELETE CASCADE");
  addColumn("cms_home_sections", "group_name", "TEXT NOT NULL DEFAULT 'custom'");
  database.exec("CREATE INDEX IF NOT EXISTS cms_url_redirects_content ON cms_url_redirects(content_id)");
  addColumn("cms_home_sections", "position", "INTEGER NOT NULL DEFAULT 0");
  database.prepare("UPDATE cms_home_sections SET group_name = 'site-copy' WHERE section_key IN ('hero', 'approach') AND group_name = 'custom'").run();
  const normalizedContentText = database.prepare(
    "SELECT id, excerpt, summary FROM content WHERE excerpt LIKE '%&%' OR summary LIKE '%&%'",
  ).all() as { id: string; excerpt: string | null; summary: string | null }[];
  const updateContentText = database.prepare("UPDATE content SET excerpt = ?, summary = ? WHERE id = ?");
  for (const item of normalizedContentText) {
    const excerpt = item.excerpt === null ? null : normalizeCmsPlainText(item.excerpt);
    const summary = item.summary === null ? null : normalizeCmsPlainText(item.summary);
    if (excerpt !== item.excerpt || summary !== item.summary) {
      updateContentText.run(excerpt, summary, item.id);
    }
  }
  const adminEmail = process.env.CMS_ADMIN_EMAIL?.trim().toLowerCase() || "admin@roarwellness.org";
  const adminPassword = process.env.CMS_ADMIN_PASSWORD?.trim();
  if (adminPassword) {
    const existingAdmin = database.prepare("SELECT id FROM cms_users WHERE email = ?").get(adminEmail);
    if (!existingAdmin) {
      const salt = randomBytes(16).toString("hex");
      const hash = scryptSync(adminPassword, salt, 64).toString("hex");
      database.prepare("INSERT INTO cms_users (id, email, name, role, password_hash) VALUES (?, ?, ?, 'admin', ?)")
        .run(randomUUID(), adminEmail, "CMS Administrator", `${salt}:${hash}`);
    }
  }
  const settingDefaults: [string, string][] = [
    ["siteName", "Roar Wellness"],
    ["siteDescription", "Personalized, evidence-based rehabilitation and mental healthcare at Roar Wellness in Delhi."],
    ["siteUrl", "https://www.roarwellness.org"],
    ["seoTitle", "Roar Wellness | Rehabilitation Centre in Delhi"],
    ["seoDescription", "Personalized, evidence-based rehabilitation and mental healthcare at Roar Wellness in Delhi."],
    ["postsPerPage", "20"],
    ["homepageHeroTitle", "Roar Wellness"],
    ["homepageHeroEyebrow", "Rehabilitation centre · Delhi"],
    ["homepageHeroDescription", "A premier rehabilitation centre committed to transforming lives through personalized, evidence-based care."],
    ["homepageApproachTitle", "Our Approach"],
    ["homepageApproachEyebrow", "Approach"],
    ["homepageApproachDescription", "At Roar Wellness Rehab Centre, we believe that healing and transformation happen through experiences. Our Evidence Based Therapy is a unique and dynamic approach designed to support individuals struggling with addiction, mental health issues, and emotional distress."],
    ["contactEmail", "help@roarwellness.org"],
    ["contactPhone", "+919319977207"],
    ["contactWhatsApp", "+919773890499"],
    ["contactAddress", "Akhil Farm, 1 Daisy Lane, Off Central Drive, DLF Chattarpur Farms, New Delhi 110074, India"],
  ];
  const seedSetting = database.prepare("INSERT OR IGNORE INTO cms_settings (key, value) VALUES (?, ?)");
  settingDefaults.forEach(([key, value]) => seedSetting.run(key, value));
  const seededHomepage = database.prepare("SELECT 1 FROM cms_bootstrap_state WHERE key = 'homepage-defaults'").get();
  if (!seededHomepage) {
    const homeDefaults: [string, string, string, string][] = [
      ["hero", "Roar Wellness", "Rehabilitation centre · Delhi", "A premier rehabilitation centre committed to transforming lives through personalized, evidence-based care."],
      ["approach", "Our Approach", "Approach", "At Roar Wellness Rehab Centre, we believe that healing and transformation happen through experiences. Our Evidence Based Therapy is a unique and dynamic approach designed to support individuals struggling with addiction, mental health issues, and emotional distress."],
    ];
    const seedHomeSection = database.prepare("INSERT OR IGNORE INTO cms_home_sections (section_key, group_name, heading, eyebrow, body) VALUES (?, 'site-copy', ?, ?, ?)");
    homeDefaults.forEach(([key, heading, eyebrow, body]) => seedHomeSection.run(key, heading, eyebrow, body));
    const seedHomeCard = database.prepare("INSERT OR IGNORE INTO cms_home_sections (section_key, group_name, heading, eyebrow, body, image_url, position) VALUES (?, ?, ?, ?, ?, ?, ?)");
    const positionByGroup = new Map<string, number>();
    homepageSeeds.forEach((item) => {
      const position = positionByGroup.get(item.group) ?? 0;
      seedHomeCard.run(item.key, item.group, item.heading, item.eyebrow, item.body, item.imageUrl, position);
      positionByGroup.set(item.group, position + 1);
    });
    database.prepare("INSERT INTO cms_bootstrap_state (key) VALUES ('homepage-defaults')").run();
  }
  const gameTherapyImageMigration = database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'facility-game-therapy-image-v1'",
  ).get();
  if (!gameTherapyImageMigration) {
    database.prepare(`
      UPDATE cms_home_sections SET image_url = ?
      WHERE section_key = 'facility-game-therapy' AND group_name = 'facility'
    `).run("/images/game-therapy.webp");
    database.prepare("INSERT INTO cms_bootstrap_state (key) VALUES ('facility-game-therapy-image-v1')").run();
  }
  const openSpaceImageMigration = database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'facility-open-space-image-v1'",
  ).get();
  if (!openSpaceImageMigration) {
    database.prepare(`
      UPDATE cms_home_sections SET image_url = ?
      WHERE section_key = 'facility-open-space'
        AND group_name = 'facility'
        AND image_url = ?
    `).run(
      "/images/facility-open-space.png",
      "https://www.roarwellness.org/wp-content/uploads/2025/04/544658068149SS_05316.jpg",
    );
    database.prepare("INSERT INTO cms_bootstrap_state (key) VALUES ('facility-open-space-image-v1')").run();
  }
  const openSpacePhotoMigration = database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'facility-open-space-image-v2'",
  ).get();
  if (!openSpacePhotoMigration) {
    database.prepare(`
      UPDATE cms_home_sections SET image_url = ?
      WHERE section_key = 'facility-open-space'
        AND group_name = 'facility'
        AND image_url = ?
    `).run(
      "/images/facility-open-space.webp",
      "/images/facility-open-space.png",
    );
    database.prepare("INSERT INTO cms_bootstrap_state (key) VALUES ('facility-open-space-image-v2')").run();
  }
  const swimmingPoolImageMigration = database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'facility-swimming-pool-image-v1'",
  ).get();
  if (!swimmingPoolImageMigration) {
    database.prepare(`
      UPDATE cms_home_sections SET image_url = ?
      WHERE section_key = 'facility-pool'
        AND group_name = 'facility'
        AND image_url = ?
    `).run(
      "/images/facility-swimming-pool.png",
      "https://www.roarwellness.org/wp-content/uploads/2025/04/452908267532SS_05330.jpg",
    );
    database.prepare("INSERT INTO cms_bootstrap_state (key) VALUES ('facility-swimming-pool-image-v1')").run();
  }
  const swimmingPoolPhotoMigration = database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'facility-swimming-pool-image-v2'",
  ).get();
  if (!swimmingPoolPhotoMigration) {
    database.prepare(`
      UPDATE cms_home_sections SET image_url = ?
      WHERE section_key = 'facility-pool'
        AND group_name = 'facility'
        AND image_url = ?
    `).run(
      "/images/facility-swimming-pool.webp",
      "/images/facility-swimming-pool.png",
    );
    database.prepare("INSERT INTO cms_bootstrap_state (key) VALUES ('facility-swimming-pool-image-v2')").run();
  }
  const yogaMeditationImageMigration = database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'facility-yoga-meditation-image-v1'",
  ).get();
  if (!yogaMeditationImageMigration) {
    database.prepare(`
      UPDATE cms_home_sections SET image_url = ?
      WHERE section_key = 'facility-yoga'
        AND group_name = 'facility'
        AND image_url = ?
    `).run(
      "/images/facility-yoga-meditation.webp",
      "https://www.roarwellness.org/wp-content/uploads/2025/04/157245510430SS_05239-1.jpg",
    );
    database.prepare("INSERT INTO cms_bootstrap_state (key) VALUES ('facility-yoga-meditation-image-v1')").run();
  }
  const therapyRoomImageMigration = database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'facility-therapy-room-image-v1'",
  ).get();
  if (!therapyRoomImageMigration) {
    database.prepare(`
      UPDATE cms_home_sections SET image_url = ?
      WHERE section_key = 'facility-therapy-room'
        AND group_name = 'facility'
        AND image_url = ?
    `).run(
      "/images/facility-therapy-room.webp",
      "https://www.roarwellness.org/wp-content/uploads/2025/04/285728832438SS_05308.jpg",
    );
    database.prepare("INSERT INTO cms_bootstrap_state (key) VALUES ('facility-therapy-room-image-v1')").run();
  }
  const facilityContentMigration = database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'facility-live-content-v1'",
  ).get();
  if (!facilityContentMigration) {
    const facilities = homepageSeeds.filter((item) => item.group === "facility");
    const keys = facilities.map((item) => item.key);
    database.prepare(
      `DELETE FROM cms_home_sections WHERE group_name = 'facility' AND section_key NOT IN (${keys.map(() => "?").join(", ")})`,
    ).run(...keys);
    const upsertFacility = database.prepare(`
      INSERT INTO cms_home_sections (section_key, group_name, heading, eyebrow, body, image_url, position)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(section_key) DO UPDATE SET
        group_name = excluded.group_name,
        heading = excluded.heading,
        eyebrow = excluded.eyebrow,
        body = excluded.body,
        image_url = excluded.image_url,
        position = excluded.position,
        is_published = 1,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    `);
    facilities.forEach((item, position) => {
      upsertFacility.run(item.key, item.group, item.heading, item.eyebrow, item.body, item.imageUrl, position);
    });
    database.prepare("INSERT INTO cms_bootstrap_state (key) VALUES ('facility-live-content-v1')").run();
  }
  const facilityImageAlignmentMigration = database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'facility-image-alignment-v1'",
  ).get();
  if (!facilityImageAlignmentMigration) {
    const updateFacilityImage = database.prepare(`
      UPDATE cms_home_sections
      SET image_url = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE section_key = ? AND group_name = 'facility'
    `);
    homepageSeeds
      .filter((item) => item.group === "facility")
      .forEach((item) => updateFacilityImage.run(item.imageUrl, item.key));
    database.prepare("INSERT INTO cms_bootstrap_state (key) VALUES ('facility-image-alignment-v1')").run();
  }
  const facilityCustomImagesMigration = database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'facility-custom-images-v1'",
  ).get();
  if (!facilityCustomImagesMigration) {
    const updateFacilityImage = database.prepare(`
      UPDATE cms_home_sections
      SET image_url = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE section_key = ? AND group_name = 'facility'
    `);
    for (const item of homepageSeeds) {
      if (["facility-therapy-room", "facility-yoga", "facility-snooker-table", "facility-table-tennis"].includes(item.key)) {
        updateFacilityImage.run(item.imageUrl, item.key);
      }
    }
    database.prepare("INSERT INTO cms_bootstrap_state (key) VALUES ('facility-custom-images-v1')").run();
  }
  const facilityGymImageMigration = database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'facility-gym-image-v1'",
  ).get();
  if (!facilityGymImageMigration) {
    database.prepare(`
      UPDATE cms_home_sections
      SET image_url = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE section_key = 'facility-gym' AND group_name = 'facility'
    `).run("/images/facility-gym.webp");
    database.prepare("INSERT INTO cms_bootstrap_state (key) VALUES ('facility-gym-image-v1')").run();
  }
  const facilityPoolImageMigration = database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'facility-pool-local-image-v1'",
  ).get();
  if (!facilityPoolImageMigration) {
    database.prepare(`
      UPDATE cms_home_sections
      SET image_url = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE section_key = 'facility-pool' AND group_name = 'facility'
    `).run("/images/facility-swimming-pool.webp");
    database.prepare("INSERT INTO cms_bootstrap_state (key) VALUES ('facility-pool-local-image-v1')").run();
  }
  const facilityOpenSpaceLocalImageMigration = database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'facility-open-space-local-image-v1'",
  ).get();
  if (!facilityOpenSpaceLocalImageMigration) {
    database.prepare(`
      UPDATE cms_home_sections
      SET image_url = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE section_key = 'facility-open-space' AND group_name = 'facility'
    `).run("/images/facility-open-space.webp");
    database.prepare("INSERT INTO cms_bootstrap_state (key) VALUES ('facility-open-space-local-image-v1')").run();
  }
  const facilityLibraryImageMigration = database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'facility-library-local-image-v1'",
  ).get();
  if (!facilityLibraryImageMigration) {
    database.prepare(`
      UPDATE cms_home_sections
      SET image_url = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE section_key = 'facility-library' AND group_name = 'facility'
    `).run("/images/facility-library.webp");
    database.prepare("INSERT INTO cms_bootstrap_state (key) VALUES ('facility-library-local-image-v1')").run();
  }
  const recoveryCommunityBlogImageMigration = database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'blog-sarah-recovery-community-image-v1'",
  ).get();
  if (!recoveryCommunityBlogImageMigration) {
    database.prepare(`
      UPDATE content
      SET image_url = ?, image_alt_text = ?,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE slug = 'sarah-overcame-alcohol-addiction'
        AND (image_url IS NULL OR image_url = '')
    `).run(
      "/images/blog-sarah-recovery-community.png",
      "A woman speaking with a counselor alongside a recovery support group.",
    );
    database.prepare("INSERT INTO cms_bootstrap_state (key) VALUES ('blog-sarah-recovery-community-image-v1')").run();
  }
  const seededFaqs = database.prepare("SELECT 1 FROM cms_bootstrap_state WHERE key = 'faq-defaults'").get();
  if (!seededFaqs) {
    const faqDefaults: [string, string][] = [
      ["What are the commonly abused drugs?", "Substances that may be misused include alcohol, cannabis, opioids, cocaine, stimulants, hallucinogens, and other drugs. The effects and risks vary by substance and person."],
      ["What are some recurring side effects to drug abuse?", "Substance use can affect physical and mental health. Possible effects vary, and anxiety, depression, sleep problems, and other concerns may occur. A qualified health professional can help assess symptoms."],
      ["What are some serious health issues related to drug abuse?", "Substance use can cause serious physical and mental health problems, including risks that require urgent medical care. If someone may be in immediate danger, contact local emergency services."],
      ["Is drug abuse influencing women in India?", "Substance use can affect people of any gender. Stigma and barriers to care can make it harder for women to seek support; confidential, non-judgmental care can help."],
      ["Why should addicts consider rehabilitation?", "Rehabilitation centres are organizations committed to seeing addicts reach a state of total abstinence based on the 12 step program."],
      ["What is 12 step treatment?", "The 12-step approach began with Alcoholics Anonymous and is used by some peer-support groups. It is one possible source of support; people can discuss treatment options with a qualified professional."],
      ["Why is the 12 steps by and large the most successful method?", "Some people find 12-step peer support helpful, while others prefer different approaches. Support needs vary, and a qualified professional can help someone find care that fits."],
    ];
    const seedFaq = database.prepare("INSERT OR IGNORE INTO cms_faqs (id, question, answer, position, status) VALUES (?, ?, ?, ?, 'published')");
    faqDefaults.forEach(([question, answer], index) => seedFaq.run(`seed-faq-${index + 1}`, question, answer, index));
    database.prepare("INSERT INTO cms_bootstrap_state (key) VALUES ('faq-defaults')").run();
  }
  const liveFaqsMigration = database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'live-homepage-faq-content-v1'",
  ).get();
  if (!liveFaqsMigration) {
    const replacements: [string, string, string, string][] = [
      [
        "What are the commonly abused drugs?",
        "Alcohol, Marijuana, amphetamine-type stimulants (basic over the counter drugs), cocaine, heroin, hallucinogens, and party drugs are commonly abused.",
        "What are the commonly abused drugs?",
        "Substances that may be misused include alcohol, cannabis, opioids, cocaine, stimulants, hallucinogens, and other drugs. The effects and risks vary by substance and person.",
      ],
      [
        "What are some recurring side effects to drug abuse?",
        "Apart from physical dependency, anxiety or depression often affects the life of nearly every addict. A psychological disorder may also arise from drug addiction.",
        "What are some recurring side effects to drug abuse?",
        "Substance use can affect physical and mental health. Possible effects vary, and anxiety, depression, sleep problems, and other concerns may occur. A qualified health professional can help assess symptoms.",
      ],
      [
        "What are some serious health issues related to drug abuse?",
        "Along with serious physiological damage, drug abuse often results in a psychological disorder and can damage neurological function.",
        "What are some serious health issues related to drug abuse?",
        "Substance use can cause serious physical and mental health problems, including risks that require urgent medical care. If someone may be in immediate danger, contact local emergency services.",
      ],
      [
        "Is drug abuse influencing women in India?",
        "Yes. The association between women and substance abuse disorder is becoming an inconvenient reality in India, as cultural roles change and addiction becomes more visible.",
        "Is drug abuse influencing women in India?",
        "Substance use can affect people of any gender. Stigma and barriers to care can make it harder for women to seek support; confidential, non-judgmental care can help.",
      ],
      [
        "What is 12 step treatment?",
        "Originally designed for alcoholics, the 12 step program begins by admitting powerlessness over alcohol and drugs, then guides people toward satisfying lives apart from substance abuse.",
        "What is 12 step treatment?",
        "The 12-step approach began with Alcoholics Anonymous and is used by some peer-support groups. It is one possible source of support; people can discuss treatment options with a qualified professional.",
      ],
      [
        "Why are the 12 steps successful?",
        "Adopted from Alcoholics Anonymous, the 12 steps help people overcome denial and develop a practice of seeking objective feedback.",
        "Why is the 12 steps by and large the most successful method?",
        "Some people find 12-step peer support helpful, while others prefer different approaches. Support needs vary, and a qualified professional can help someone find care that fits.",
      ],
    ];
    const updateFaq = database.prepare(
      "UPDATE cms_faqs SET question = ?, answer = ? WHERE id = ? AND question = ? AND answer = ?",
    );
    database.exec("BEGIN IMMEDIATE");
    try {
      replacements.forEach(([oldQuestion, oldAnswer, question, answer], index) => {
        updateFaq.run(question, answer, `seed-faq-${index + 1}`, oldQuestion, oldAnswer);
      });
      database.prepare("INSERT INTO cms_bootstrap_state (key) VALUES ('live-homepage-faq-content-v1')").run();
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
  const liveFaqsMigrationV2 = database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'live-homepage-faq-content-v2'",
  ).get();
  if (!liveFaqsMigrationV2) {
    const replacements: [string, string, string, string, string][] = [
      [
        "seed-faq-6",
        "What is 12 step treatment?",
        "Originally designed for alcoholics, the 12 step program begins by admitting powerlessness over alcohol and drugs, then guides people toward satisfying lives apart from substance abuse.",
        "What is 12 step treatment?",
        "The 12-step approach began with Alcoholics Anonymous and is used by some peer-support groups. It is one possible source of support; people can discuss treatment options with a qualified professional.",
      ],
      [
        "seed-faq-7",
        "Why are the 12 steps successful?",
        "Adopted from Alcoholics Anonymous, the 12 steps help people overcome denial and develop a practice of seeking objective feedback.",
        "Why is the 12 steps by and large the most successful method?",
        "Some people find 12-step peer support helpful, while others prefer different approaches. Support needs vary, and a qualified professional can help someone find care that fits.",
      ],
    ];
    const updateFaq = database.prepare(
      "UPDATE cms_faqs SET question = ?, answer = ? WHERE id = ? AND question = ? AND answer = ?",
    );
    database.exec("BEGIN IMMEDIATE");
    try {
      replacements.forEach(([id, oldQuestion, oldAnswer, question, answer]) => {
        updateFaq.run(question, answer, id, oldQuestion, oldAnswer);
      });
      database.prepare("INSERT INTO cms_bootstrap_state (key) VALUES ('live-homepage-faq-content-v2')").run();
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
  const seedCategory = database.prepare(
    "INSERT OR IGNORE INTO categories (id, name, slug, is_default) VALUES (?, ?, ?, 1)",
  );
  [
    ["treatments", "Treatments", "treatments"],
    ["therapy", "Therapy", "therapy"],
    ["mental-healthcare", "Mental healthcare", "mental-healthcare"],
    ["main-pages", "Main pages", "main-pages"],
    ["blog", "Blog", "blog"],
  ].forEach(([id, name, slug]) => seedCategory.run(id, name, slug));
  const importedSnapshot = database.prepare("SELECT 1 FROM cms_bootstrap_state WHERE key = 'wordpress-content-v1'").get();
  if (!importedSnapshot) {
    const snapshot = JSON.parse(readFileSync(resolve(process.cwd(), "data/wordpress-content.json"), "utf8")) as {
      items: Record<string, unknown>[];
    };
    const categoryIds = new Map(
      (database.prepare("SELECT id, slug FROM categories").all() as { id: string; slug: string }[])
        .map((category) => [category.slug, category.id]),
    );
    const insertContent = database.prepare(`
      INSERT INTO content (
        id, title, slug, category_id, excerpt, summary, description, content,
        image_url, status, seo_title, seo_description, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      ON CONFLICT(slug) DO UPDATE SET
        title = excluded.title, category_id = excluded.category_id,
        excerpt = COALESCE(content.excerpt, excluded.excerpt),
        summary = COALESCE(content.summary, excluded.summary),
        description = COALESCE(content.description, excluded.description),
        content = excluded.content, image_url = COALESCE(content.image_url, excluded.image_url),
        status = 'published', seo_title = COALESCE(content.seo_title, excluded.seo_title),
        seo_description = COALESCE(content.seo_description, excluded.seo_description),
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
        published_at = COALESCE(content.published_at, excluded.published_at)
      WHERE content.content IS NULL OR content.content = ''
    `);
    const importTransaction = database.prepare("INSERT INTO cms_bootstrap_state (key) VALUES ('wordpress-content-v1')");
    database.exec("BEGIN IMMEDIATE");
    try {
      for (const row of snapshot.items) {
        const rawSlug = typeof row.slug === "string" ? row.slug : "";
        const categorySlug = inferImportedCategorySlug(row, rawSlug);
        const categoryId = categoryIds.get(categorySlug);
        if (!categoryId) throw new Error(`Initial WordPress content references missing category “${categorySlug}”.`);
        const input = parseImportedContent(row, categoryId);
        insertContent.run(
          randomUUID(), input.title, input.slug, input.categoryId, input.excerpt, input.summary,
          input.description, input.content, input.imageUrl, input.seoTitle, input.seoDescription,
        );
      }
      importTransaction.run();
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
  const routeTaxonomyMigration = database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'content-route-taxonomy-v2'",
  ).get();
  if (!routeTaxonomyMigration) {
    const snapshot = JSON.parse(readFileSync(resolve(process.cwd(), "data/wordpress-content.json"), "utf8")) as {
      items: Record<string, unknown>[];
    };
    const categoryIds = new Map(
      (database.prepare("SELECT id, slug FROM categories").all() as { id: string; slug: string }[])
        .map((category) => [category.slug, category.id]),
    );
    const updateCategory = database.prepare(`
      UPDATE content SET category_id = ?
      WHERE slug = ? AND category_id = (SELECT id FROM categories WHERE slug = ?)
    `);
    database.exec("BEGIN IMMEDIATE");
    try {
      for (const row of snapshot.items) {
        const slug = typeof row.slug === "string" ? row.slug : "";
        const postType = typeof row.post_type === "string" ? row.post_type : "";
        const categorySlug = inferImportedCategorySlug(row, slug);
        const previousCategory = postType === "post" ? "blog"
          : slug === "drug-alcohol-rehabilitation-experts" ? "treatments"
            : categorySlug;
        if (categorySlug === previousCategory) continue;
        const categoryId = categoryIds.get(categorySlug);
        if (!categoryId) throw new Error(`Route taxonomy references missing category “${categorySlug}”.`);
        updateCategory.run(categoryId, slug, previousCategory);
      }
      database.prepare("INSERT OR IGNORE INTO cms_bootstrap_state (key) VALUES ('content-route-taxonomy-v2')").run();
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
  const rehabArticleMigration = database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'service-route-classification-v3'",
  ).get();
  if (!rehabArticleMigration) {
    const treatmentCategory = database.prepare("SELECT id FROM categories WHERE slug = 'treatments'").get() as { id: string } | undefined;
    if (!treatmentCategory) throw new Error("Service route classification requires the Treatments category.");
    database.exec("BEGIN IMMEDIATE");
    try {
      database.prepare(`
        UPDATE content SET category_id = ?
        WHERE slug = 'rehab-center-in-india'
          AND category_id = (SELECT id FROM categories WHERE slug = 'blog')
      `).run(treatmentCategory.id);
      database.prepare("INSERT OR IGNORE INTO cms_bootstrap_state (key) VALUES ('service-route-classification-v3')").run();
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
  const serviceArticleMigration = database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'service-article-categories-v4'",
  ).get();
  if (!serviceArticleMigration) {
    const snapshot = JSON.parse(readFileSync(resolve(process.cwd(), "data/wordpress-content.json"), "utf8")) as {
      items: Record<string, unknown>[];
    };
    const categoryIds = new Map(
      (database.prepare("SELECT id, slug FROM categories").all() as { id: string; slug: string }[])
        .map((category) => [category.slug, category.id]),
    );
    const updateCategory = database.prepare(`
      UPDATE content SET category_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE slug = ? AND category_id = (SELECT id FROM categories WHERE slug = 'blog')
    `);
    database.exec("BEGIN IMMEDIATE");
    try {
      for (const row of snapshot.items) {
        if (row.post_type !== "post" || typeof row.slug !== "string") continue;
        const categorySlug = inferImportedCategorySlug(row, row.slug);
        if (categorySlug === "blog") continue;
        const categoryId = categoryIds.get(categorySlug);
        if (!categoryId) throw new Error(`Service article classification references missing category “${categorySlug}”.`);
        updateCategory.run(categoryId, row.slug);
      }
      database.prepare("INSERT OR IGNORE INTO cms_bootstrap_state (key) VALUES ('service-article-categories-v4')").run();
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
  const blogPostMigration = database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'wordpress-posts-blog-v5'",
  ).get();
  if (!blogPostMigration) {
    const snapshot = JSON.parse(readFileSync(resolve(process.cwd(), "data/wordpress-content.json"), "utf8")) as {
      items: Record<string, unknown>[];
    };
    const blogCategory = database.prepare("SELECT id FROM categories WHERE slug = 'blog'").get() as { id: string } | undefined;
    if (!blogCategory) throw new Error("WordPress post classification requires the Blog category.");
    const findImportedPost = database.prepare(`
      SELECT c.id, c.slug, cat.slug AS category_slug
      FROM content c JOIN categories cat ON cat.id = c.category_id
      WHERE c.slug = ? AND c.status = 'published'
        AND cat.slug IN ('treatments', 'therapy', 'mental-healthcare')
    `);
    const updateCategory = database.prepare(`
      UPDATE content SET category_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?
    `);
    const recordRedirect = database.prepare(`
      INSERT INTO cms_url_redirects (source_path, content_id) VALUES (?, ?)
      ON CONFLICT(source_path) DO UPDATE SET content_id = excluded.content_id
    `);
    database.exec("BEGIN IMMEDIATE");
    try {
      for (const row of snapshot.items) {
        if (row.post_type !== "post" || typeof row.slug !== "string"
          || inferImportedCategorySlug(row, row.slug) !== "blog") continue;
        const current = findImportedPost.get(row.slug) as {
          id: string;
          slug: string;
          category_slug: string;
        } | undefined;
        if (!current) continue;
        const previousPath = getCmsContentHref(current.slug, current.category_slug);
        updateCategory.run(blogCategory.id, current.id);
        recordRedirect.run(previousPath, current.id);
      }
      database.prepare("INSERT OR IGNORE INTO cms_bootstrap_state (key) VALUES ('wordpress-posts-blog-v5')").run();
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
  return database;
}

export function getCmsDatabase(): DatabaseSync {
  if (!globalCms.roarCmsDatabase) globalCms.roarCmsDatabase = openDatabase();
  if (!globalCms.roarCmsPublishTimer) {
    globalCms.roarCmsPublishTimer = setInterval(() => {
      try {
        publishDueContent(globalCms.roarCmsDatabase!);
      } catch (error) {
        console.error("Failed to publish scheduled CMS content.", error);
      }
    }, 30_000);
    globalCms.roarCmsPublishTimer.unref();
  }
  return globalCms.roarCmsDatabase;
}

export function listCategories(): CmsCategory[] {
  return getCmsDatabase()
    .prepare("SELECT id, name, slug, is_default, created_at FROM categories ORDER BY is_default DESC, name COLLATE NOCASE")
    .all() as unknown as CmsCategory[];
}

export function findCategory(id: string): CmsCategory | undefined {
  return getCmsDatabase()
    .prepare("SELECT id, name, slug, is_default, created_at FROM categories WHERE id = ?")
    .get(id) as unknown as CmsCategory | undefined;
}

const contentSelect = `
  SELECT c.id, c.title, c.slug, c.category_id, cat.name AS category_name,
    cat.slug AS category_slug, c.excerpt, c.summary, c.description, c.content,
    c.image_url, c.image_alt_text, c.image_position, c.status, c.seo_title, c.seo_description, c.seo_keywords, c.seo_robots, c.scheduled_publish_at,
    c.created_at, c.updated_at, c.published_at
  FROM content c JOIN categories cat ON cat.id = c.category_id
`;

export function listContent(options: {
  includeUnpublished?: boolean;
  categoryId?: string;
  categorySlug?: string;
} = {}): CmsContent[] {
  const clauses: string[] = [];
  const values: string[] = [];
  if (!options.includeUnpublished) clauses.push("c.status = 'published'");
  if (options.categoryId) {
    clauses.push("c.category_id = ?");
    values.push(options.categoryId);
  }
  if (options.categorySlug) {
    clauses.push("cat.slug = ?");
    values.push(options.categorySlug);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const database = getCmsDatabase();
  if (!options.includeUnpublished) {
    publishDueContent(database);
  }
  return database.prepare(`${contentSelect} ${where} ORDER BY c.updated_at DESC, c.title COLLATE NOCASE`)
    .all(...values) as unknown as CmsContent[];
}

function publishDueContent(database: DatabaseSync): void {
  database.prepare(`
    UPDATE content SET status = 'published', published_at = COALESCE(published_at, scheduled_publish_at),
      scheduled_publish_at = NULL, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE status = 'draft' AND scheduled_publish_at IS NOT NULL AND scheduled_publish_at <= ?
  `).run(new Date().toISOString());
}

export function getCmsSettings(): Record<string, string> {
  const rows = getCmsDatabase().prepare("SELECT key, value FROM cms_settings").all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map(({ key, value }) => [key, value]));
}

export function recordContentRevision(contentId: string, createdBy: string | null): void {
  const item = findContentById(contentId);
  if (!item) return;
  getCmsDatabase().prepare("INSERT INTO cms_revisions (id, content_id, snapshot, created_by) VALUES (?, ?, ?, ?)")
    .run(randomUUID(), contentId, JSON.stringify(item), createdBy);
}

export function findContentBySlug(slug: string, includeUnpublished = false): CmsContent | undefined {
  const statusClause = includeUnpublished ? "" : "AND c.status = 'published'";
  return getCmsDatabase()
    .prepare(`${contentSelect} WHERE c.slug = ? ${statusClause}`)
    .get(slug) as unknown as CmsContent | undefined;
}

export function findContentById(id: string): CmsContent | undefined {
  return getCmsDatabase()
    .prepare(`${contentSelect} WHERE c.id = ?`)
    .get(id) as unknown as CmsContent | undefined;
}

export function findPublishedContentRedirect(sourcePath: string): CmsContent | undefined {
  listContent();
  return getCmsDatabase()
    .prepare(`${contentSelect}
      JOIN cms_url_redirects redirect ON redirect.content_id = c.id
      WHERE redirect.source_path = ? AND c.status = 'published'`)
    .get(sourcePath) as unknown as CmsContent | undefined;
}

export function toPublicContent(item: CmsContent) {
  return {
    ...item,
    featured_image_url: item.image_url,
    featured_image_alt: item.image_alt_text,
    featured_image_position: item.image_position,
  };
}
