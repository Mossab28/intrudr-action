import { test, expect, vi } from 'vitest'
import { submitCiScan, mapVulnsToFindings, IntrudrApiError } from '../src/api/client'

function mockFetch(responses: Array<{ status: number; body: unknown; headers?: Record<string, string> }>) {
  let i = 0
  return vi.fn(async () => {
    const r = responses[Math.min(i++, responses.length - 1)]
    return { status: r.status, ok: r.status >= 200 && r.status < 300, json: async () => r.body, headers: { get: (h: string) => r.headers?.[h.toLowerCase()] ?? null } } as unknown as Response
  })
}

test('submitCiScan posts target+depth+manifest and returns id', async () => {
  const fetch = mockFetch([{ status: 201, body: { id: 's1', reportUrl: 'https://intrudr.io/scans/s1', verificationRequired: false } }])
  const res = await submitCiScan({ apiBaseUrl: 'https://intrudr.io', apiKey: 'k', target: 'https://a.com', depth: 'light', manifest: { stack: [], routes: [], deps: [], secretsCount: 0 } }, fetch as unknown as typeof globalThis.fetch)
  expect(res.id).toBe('s1')
  const call = fetch.mock.calls[0] as unknown as [string, RequestInit]
  const body = JSON.parse(call[1].body as string)
  expect(body.depth).toBe('light'); expect(body.manifest).toBeDefined()
})

test('submitCiScan throws on 402', async () => {
  const fetch = mockFetch([{ status: 402, body: { error: 'used', upgrade: 'https://intrudr.io/pricing' } }])
  await expect(submitCiScan({ apiBaseUrl: 'https://intrudr.io', apiKey: 'k', target: 'https://a.com', depth: 'light', manifest: { stack: [], routes: [], deps: [], secretsCount: 0 } }, fetch as unknown as typeof globalThis.fetch)).rejects.toThrow(IntrudrApiError)
})

test('submitCiScan throws clear error on verificationRequired', async () => {
  const fetch = mockFetch([{ status: 201, body: { id: 's1', verificationRequired: true } }])
  await expect(submitCiScan({ apiBaseUrl: 'https://intrudr.io', apiKey: 'k', target: 'https://a.com', depth: 'light', manifest: { stack: [], routes: [], deps: [], secretsCount: 0 } }, fetch as unknown as typeof globalThis.fetch)).rejects.toThrow(/verify/i)
})

test('mapVulnsToFindings tags external + lowercases severity', () => {
  const f = mapVulnsToFindings([{ severity: 'CRITICAL', title: 'SQLi', affectedUrl: 'https://a.com/login' }])
  expect(f[0]).toMatchObject({ source: 'external', severity: 'critical', location: 'https://a.com/login' })
})
