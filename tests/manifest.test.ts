import { test, expect } from 'vitest'
import { buildManifest } from '../src/internal/manifest'
test('builds a metadata-only manifest (no source, secrets as count)', () => {
  const m = buildManifest({
    files: ['package.json', 'src/app/api/login/route.ts', '.env'],
    pkg: { dependencies: { next: '14.0.0' } },
    secrets: [{ source: 'internal', severity: 'high', title: 'AWS key', location: '.env:1' }],
    deps: [{ source: 'internal', severity: 'high', title: 'lodash@4.17.0 — proto pollution', location: 'lodash@4.17.0' }],
  })
  expect(m.stack).toContain('next')
  expect(m.routes).toContain('/api/login')
  expect(m.secretsCount).toBe(1)
  expect(JSON.stringify(m)).not.toContain('AWS key')
})

test('buildManifest never leaks secret values from title or location', () => {
  const SECRET = 'AKIA-FAKE-SECRET-VALUE'
  const m = buildManifest({
    files: ['package.json'],
    pkg: { dependencies: {} },
    secrets: [
      { source: 'internal', severity: 'critical', title: `Found secret: ${SECRET}`, location: `config.ts:1 (${SECRET})` },
      { source: 'internal', severity: 'high', title: `Another secret: ${SECRET}`, location: `.env:5` },
    ],
    deps: [],
  })
  expect(JSON.stringify(m)).not.toContain(SECRET)
  expect(typeof m.secretsCount).toBe('number')
  expect(m.secretsCount).toBe(2)
})
