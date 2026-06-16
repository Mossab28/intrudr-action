import { test, expect } from 'vitest'
import { parseOsv } from '../src/internal/deps'
test('parseOsv maps osv-scanner results to Findings with mapped severity', () => {
  const raw = JSON.stringify({ results: [{ packages: [{ package: { name: 'lodash', version: '4.17.0' }, vulnerabilities: [{ id: 'GHSA-x', summary: 'Prototype pollution', database_specific: { severity: 'HIGH' } }] }] }] })
  const findings = parseOsv(raw)
  expect(findings).toHaveLength(1)
  expect(findings[0]).toMatchObject({ source: 'internal', severity: 'high' })
  expect(findings[0].title).toContain('lodash')
})
test('parseOsv tolerates empty/invalid output', () => {
  expect(parseOsv('')).toEqual([])
  expect(parseOsv('{}')).toEqual([])
})
