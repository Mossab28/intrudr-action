import { test, expect, vi } from 'vitest'
import { run } from '../src/main'

test('run aggregates internal + external and fails on threshold', async () => {
  const deps = {
    config: { apiKey: 'k', targetUrl: 'https://a.com', depth: 'light', failOn: 'high', runInternal: true, runExternal: true, apiBaseUrl: 'https://intrudr.io', githubToken: 't' },
    runSecretsScan: () => [{ source: 'internal', severity: 'low', title: 'minor' }],
    runDepsScan: () => [],
    listFiles: () => ['package.json'],
    readPkg: () => ({ dependencies: { next: '14.0.0' } }),
    buildManifest: (i: never) => ({ stack: ['next'], routes: [], deps: [], secretsCount: 0 }),
    submitCiScan: vi.fn(async () => ({ id: 's1', reportUrl: 'https://intrudr.io/scans/s1' })),
    pollScan: vi.fn(async () => ({ reportUrl: 'https://intrudr.io/scans/s1', riskScore: 80, findings: [{ source: 'external', severity: 'critical', title: 'SQLi' }] })),
    publish: vi.fn(async () => {}),
    workdir: '/repo',
  }
  const result = await run(deps as never)
  expect(result.failed).toBe(true)
  expect(deps.publish).toHaveBeenCalled()
  expect(deps.submitCiScan).toHaveBeenCalled()
})

test('run stays internal-only (no server call) when external disabled', async () => {
  const submitCiScan = vi.fn()
  const deps = {
    config: { apiKey: '', targetUrl: '', depth: 'light', failOn: 'high', runInternal: true, runExternal: false, apiBaseUrl: 'https://intrudr.io', githubToken: 't' },
    runSecretsScan: () => [], runDepsScan: () => [], listFiles: () => [], readPkg: () => ({}),
    buildManifest: () => ({ stack: [], routes: [], deps: [], secretsCount: 0 }),
    submitCiScan, pollScan: vi.fn(), publish: vi.fn(async () => {}), workdir: '/repo',
  }
  const result = await run(deps as never)
  expect(submitCiScan).not.toHaveBeenCalled()
  expect(result.failed).toBe(false)
})
