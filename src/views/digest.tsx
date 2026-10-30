import type { Night } from '../digest/types.js';

export function DigestPage({ digest }: { digest: Night }) {
  return (
    <>
      <h1>digest {digest.night}</h1>
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th><th>owner</th><th>runs</th><th>retries</th><th>last status</th><th>last error</th><th>first</th><th>last</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((r) => (
              <tr>
                <td>{r.job}</td>
                <td>{r.owner ?? '—'}</td>
                <td>{r.runs}</td>
                <td class={r.retries >= 3 ? 'warn' : undefined}>{r.retries}{r.retries >= 3 ? ' !' : ''}</td>
                <td class={r.lastStatus === 'fail' ? 'warn' : undefined}>{r.lastStatus === 'fail' ? 'fail !' : r.lastStatus}</td>
                <td>{r.lastError ?? '—'}</td>
                <td>{r.firstAt}</td>
                <td>{r.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p class="mute">{digest.badLines} unreadable {digest.badLines === 1 ? 'line' : 'lines'}</p>
    </>
  );
}
