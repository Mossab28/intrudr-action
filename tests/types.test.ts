import { test, expect } from 'vitest'
import { SEVERITY_ORDER, maxSeverity } from '../src/types'
test('maxSeverity picks the highest by SEVERITY_ORDER', () => {
  expect(maxSeverity(['low', 'critical', 'medium'])).toBe('critical')
  expect(maxSeverity([])).toBe(null)
  expect(SEVERITY_ORDER.indexOf('critical')).toBeLessThan(SEVERITY_ORDER.indexOf('low'))
})
