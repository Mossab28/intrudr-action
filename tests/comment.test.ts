import { test, expect } from 'vitest'
import { renderComment } from '../src/report/comment'

test('renders both sections, badge, CTA when no external', () => {
  const md = renderComment({ internal: [{ source: 'internal', severity: 'high', title: 'Secret detected: AWS key', location: 'a.ts:1' }], external: [], externalRan: false, reportUrl: null, riskScore: null })
  expect(md).toContain('<!-- intrudr-action -->')
  expect(md).toContain('Internal'); expect(md).toContain('Secret detected')
  expect(md).toContain('Add an IntrudR API key'); expect(md).toContain('img.shields.io')
})

test('renders external section + report link when external ran', () => {
  const md = renderComment({ internal: [], external: [{ source: 'external', severity: 'critical', title: 'SQL injection', location: 'https://a.com/login' }], externalRan: true, reportUrl: 'https://intrudr.io/scans/s1', riskScore: 82 })
  expect(md).toContain('External'); expect(md).toContain('SQL injection'); expect(md).toContain('https://intrudr.io/scans/s1')
  expect(md).not.toContain('Add an IntrudR API key')
})

test('renders failure warning and no "no findings ✅" when externalFailed', () => {
  const md = renderComment({ internal: [{ source: 'internal', severity: 'high', title: 'Some secret', location: 'a.ts:1' }], external: [], externalRan: true, externalFailed: true, reportUrl: 'https://intrudr.io/scans/s1', riskScore: null })
  expect(md).toContain('External scan failed')
  expect(md).toContain('https://intrudr.io/scans/s1')
  expect(md).not.toContain('no findings ✅')
})
