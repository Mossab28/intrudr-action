import { test, expect } from 'vitest'
import { shouldFail } from '../src/report/gate'

test('fails when a finding meets/exceeds threshold', () => {
  expect(shouldFail([{ source: 'internal', severity: 'high', title: 'x' }], 'high')).toBe(true)
  expect(shouldFail([{ source: 'external', severity: 'critical', title: 'x' }], 'high')).toBe(true)
})

test('passes when all below threshold', () => {
  expect(shouldFail([{ source: 'internal', severity: 'low', title: 'x' }], 'high')).toBe(false)
  expect(shouldFail([], 'high')).toBe(false)
})
