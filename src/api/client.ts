import type { Finding, Severity, ScanResult } from '../types'
import type { ReconManifest } from '../internal/manifest-types'

export class IntrudrApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = 'IntrudrApiError' }
}

interface SubmitArgs { apiBaseUrl: string; apiKey: string; target: string; depth: 'light' | 'full'; manifest: ReconManifest }

export async function submitCiScan(a: SubmitArgs, fetchImpl: typeof globalThis.fetch = globalThis.fetch): Promise<{ id: string; reportUrl: string | null }> {
  const res = await fetchImpl(`${a.apiBaseUrl}/api/v1/ci-scans`, {
    method: 'POST',
    headers: { authorization: `Bearer ${a.apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ target: a.target, depth: a.depth, manifest: a.manifest, acknowledged: true }),
  })
  const body = await res.json().catch(() => ({})) as Record<string, unknown>
  if (res.status === 402) throw new IntrudrApiError(`${body.error ?? 'Paid plan required'} — ${body.upgrade ?? a.apiBaseUrl + '/pricing'}`, 402)
  if (res.status === 401) throw new IntrudrApiError('Invalid IntrudR API key.', 401)
  if (res.status >= 400) throw new IntrudrApiError(String(body.error ?? `API error ${res.status}`), res.status)
  return { id: String(body.id), reportUrl: (body.reportUrl as string) ?? null }
}

interface RawVuln { severity?: string; title?: string; affectedUrl?: string; description?: string; remediation?: string }

export function mapVulnsToFindings(vulns: RawVuln[]): Finding[] {
  return (vulns ?? []).map(v => ({
    source: 'external' as const,
    severity: (String(v.severity ?? 'info').toLowerCase() as Severity),
    title: v.title ?? 'Finding',
    detail: v.remediation ?? v.description,
    location: v.affectedUrl,
  }))
}

export async function pollScan(
  a: { apiBaseUrl: string; apiKey: string; id: string },
  opts: { intervalMs?: number; timeoutMs?: number; sleep?: (ms: number) => Promise<void>; fetchImpl?: typeof globalThis.fetch } = {},
): Promise<ScanResult> {
  const interval = opts.intervalMs ?? 15_000
  const timeout = opts.timeoutMs ?? 20 * 60_000
  const sleep = opts.sleep ?? ((ms: number) => new Promise(r => setTimeout(r, ms)))
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const res = await fetchImpl(`${a.apiBaseUrl}/api/v1/scans/${a.id}`, { headers: { authorization: `Bearer ${a.apiKey}` } })
    if (res.status === 429) { await sleep(Number(res.headers.get('retry-after') ?? '60') * 1000); continue }
    if (res.status >= 400) throw new IntrudrApiError('Polling failed: ' + res.status, res.status)
    const body = await res.json().catch(() => ({})) as Record<string, unknown>
    const status = String(body.status ?? 'PENDING')
    if (status === 'FAILED') {
      return { reportUrl: (body.reportUrl as string) ?? null, riskScore: (body.riskScore as number) ?? null, findings: [], failed: true }
    }
    if (status === 'DONE') {
      const reconNote = (body.recon as { rationale?: string } | null)?.rationale ?? null
      return { reportUrl: (body.reportUrl as string) ?? null, riskScore: (body.riskScore as number) ?? null, findings: mapVulnsToFindings(body.vulnerabilities as RawVuln[]), failed: false, reconNote }
    }
    await sleep(interval)
  }
  throw new IntrudrApiError('Timed out waiting for external scan to finish.', 408)
}
