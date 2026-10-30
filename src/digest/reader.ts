import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, JobStatus, Night, ReadNight } from './types.js';

type LogLine = { at: string; job: string; status: JobStatus; owner: string | null; error: string | null };

const statuses: readonly string[] = ['ok', 'retry', 'fail'];

// Parse at the edge: anything that isn't a well-formed log line is undefined.
function parseLine(line: string): LogLine | undefined {
  let v: unknown;
  try {
    v = JSON.parse(line);
  } catch {
    return undefined;
  }
  if (typeof v !== 'object' || v === null) return undefined;
  const o = v as Record<string, unknown>;
  if (typeof o.at !== 'string' || typeof o.job !== 'string') return undefined;
  if (typeof o.status !== 'string' || !statuses.includes(o.status)) return undefined;
  return {
    at: o.at,
    job: o.job,
    status: o.status as JobStatus,
    owner: typeof o.owner === 'string' ? o.owner : null,
    error: typeof o.error === 'string' ? o.error : null,
  };
}

export const readNight: ReadNight = (runsDir, night): Night | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return null;
  const file = join(runsDir, `${night}.jsonl`);
  if (!existsSync(file)) return null;

  const rows = new Map<string, DigestRow>();
  let badLines = 0;
  const counts: Record<JobStatus, number> = { ok: 0, retry: 0, fail: 0 };
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    const l = parseLine(line);
    if (!l) {
      badLines++;
      continue;
    }
    counts[l.status]++;
    const row = rows.get(l.job);
    if (!row) {
      rows.set(l.job, {
        job: l.job,
        owner: l.owner,
        runs: 1,
        retries: l.status === 'retry' ? 1 : 0,
        lastStatus: l.status,
        lastError: l.error,
        firstAt: l.at,
        lastAt: l.at,
      });
      continue;
    }
    row.runs++;
    if (l.status === 'retry') row.retries++;
    row.lastStatus = l.status;
    row.lastError = l.error ?? row.lastError;
    row.lastAt = l.at;
    row.owner = l.owner ?? row.owner;
  }
  return { night, rows: [...rows.values()].sort((a, b) => a.job.localeCompare(b.job)), badLines, counts };
};
