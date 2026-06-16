import { SEVERITY_ORDER, type Finding, type Severity } from '../types'

export function shouldFail(findings: Finding[], threshold: Severity): boolean {
  const limit = SEVERITY_ORDER.indexOf(threshold)
  return findings.some(f => SEVERITY_ORDER.indexOf(f.severity) <= limit)
}
