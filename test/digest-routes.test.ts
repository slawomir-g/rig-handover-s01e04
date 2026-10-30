import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

function tempRuns(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  return createApp({ adapter: 'shim', installed: 'x', beatEverySeconds: 60, runsDir: dir });
}

const line = (job: string, status: string, owner: string | null = 'rook') =>
  JSON.stringify({ at: '2026-10-28T23:00:00+01:00', job, status, owner });

describe('digest routes', () => {
  const app = tempRuns({
    '2026-01-01.jsonl': [line('b/job', 'ok'), line('a/job', 'fail', null), 'not json'].join('\n'),
    '2026-01-02.jsonl': '',
  });

  it('page: 200, sorted by job, fail marked, null owner as —', async () => {
    const res = await app.request('/digest/2026-01-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html.indexOf('a/job')).toBeLessThan(html.indexOf('b/job'));
    expect(html).toContain('fail !');
    expect(html).toContain('—');
    expect(html).toContain('1 unreadable line');
  });

  it('JSON agrees with the page on jobs and order', async () => {
    const html = await (await app.request('/digest/2026-01-01')).text();
    const json = (await (await app.request('/api/digest/2026-01-01')).json()) as { rows: { job: string }[]; badLines: number };
    expect(json.badLines).toBe(1);
    const jobs = json.rows.map((r) => r.job);
    expect(jobs).toEqual(['a/job', 'b/job']);
    expect(html.indexOf(jobs[0]!)).toBeLessThan(html.indexOf(jobs[1]!));
  });

  it('404 for a night with no file', async () => {
    expect((await app.request('/digest/2020-01-01')).status).toBe(404);
    expect((await app.request('/api/digest/2020-01-01')).status).toBe(404);
  });

  it('empty night renders "nothing ran"', async () => {
    const res = await app.request('/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('board links each night to its digest with counts', async () => {
    const html = await (await app.request('/')).text();
    expect(html).toContain('href="/digest/2026-01-01"');
    expect(html).toContain('ok 1 · retry 0 · fail 1');
  });
});
