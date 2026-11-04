import { getCmsDatabase } from "@/lib/cms-db";

export type CmsJobName = "backup" | "backup-check" | "notifications";
export type CmsJobStatus = "running" | "succeeded" | "failed";

export interface CmsJobRun {
  job_key: CmsJobName;
  status: CmsJobStatus;
  started_at: string;
  finished_at: string | null;
  summary: string | null;
}

function ensureCmsJobRunsTable() {
  const database = getCmsDatabase();
  database.exec(`
    CREATE TABLE IF NOT EXISTS cms_job_runs (
      job_key TEXT PRIMARY KEY CHECK (job_key IN ('backup', 'backup-check', 'notifications')),
      status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
      started_at TEXT NOT NULL,
      finished_at TEXT,
      summary TEXT
    )
  `);
  return database;
}

function recordCmsJobState(job: CmsJobName, status: CmsJobStatus, summary: string | null) {
  const database = ensureCmsJobRunsTable();
  const now = new Date().toISOString();
  if (status === "running") {
    database.prepare(`
      INSERT INTO cms_job_runs (job_key, status, started_at, finished_at, summary)
      VALUES (?, 'running', ?, NULL, NULL)
      ON CONFLICT(job_key) DO UPDATE SET
        status = 'running', started_at = excluded.started_at, finished_at = NULL, summary = NULL
    `).run(job, now);
    return;
  }
  database.prepare(`
    UPDATE cms_job_runs SET status = ?, finished_at = ?, summary = ? WHERE job_key = ?
  `).run(status, now, summary, job);
}

export async function runCmsJob<T>(
  job: CmsJobName,
  action: () => Promise<T>,
  successSummary: (result: T) => string,
  didSucceed: (result: T) => boolean = () => true,
): Promise<T> {
  recordCmsJobState(job, "running", null);
  try {
    const result = await action();
    recordCmsJobState(job, didSucceed(result) ? "succeeded" : "failed", successSummary(result).slice(0, 200));
    return result;
  } catch (error) {
    recordCmsJobState(job, "failed", "The scheduled job failed. Check the hosting scheduler logs.");
    throw error;
  }
}

export function getCmsJobRuns(): CmsJobRun[] {
  const database = ensureCmsJobRunsTable();
  return database.prepare(`
    SELECT job_key, status, started_at, finished_at, summary
    FROM cms_job_runs ORDER BY job_key
  `).all() as unknown as CmsJobRun[];
}
