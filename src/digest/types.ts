export type JobStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log. Times keep the offset from the log (styleguide).
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: JobStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string;
  rows: DigestRow[];
  badLines: number;
  // Log lines per status, over the whole night.
  counts: Record<JobStatus, number>;
};

// Reads runs/<night>.jsonl. Returns null when the night has no file.
// A line that doesn't parse is counted in badLines, never thrown.
export type ReadNight = (runsDir: string, night: string) => Night | null;
