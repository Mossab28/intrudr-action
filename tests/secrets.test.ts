import { test, expect } from 'vitest'
import { parseGitleaks } from '../src/internal/secrets'
test('parseGitleaks maps gitleaks JSON to high-severity Findings', () => {
  const raw = JSON.stringify([{ RuleID: 'aws-access-token', File: 'src/config.ts', StartLine: 12, Description: 'AWS Access Key' }])
  const findings = parseGitleaks(raw)
  expect(findings).toHaveLength(1)
  expect(findings[0]).toMatchObject({ source: 'internal', severity: 'high', location: 'src/config.ts:12' })
  expect(findings[0].title).toContain('Secret')
})
test('parseGitleaks tolerates empty/invalid output', () => {
  expect(parseGitleaks('')).toEqual([])
  expect(parseGitleaks('not json')).toEqual([])
})
