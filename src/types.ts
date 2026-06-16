export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'
export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info']
export interface Finding {
  source: 'internal' | 'external'
  severity: Severity
  title: string
  detail?: string
  location?: string
}
export interface ScanResult {
  reportUrl: string | null
  riskScore: number | null
  findings: Finding[]
}
export function maxSeverity(list: Severity[]): Severity | null {
  let best: Severity | null = null
  for (const s of list) {
    if (best === null || SEVERITY_ORDER.indexOf(s) < SEVERITY_ORDER.indexOf(best)) best = s
  }
  return best
}
