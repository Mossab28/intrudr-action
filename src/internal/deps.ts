import { execFileSync } from 'node:child_process'
import * as core from '@actions/core'
import type { Finding, Severity } from '../types'
function mapSeverity(raw?: string): Severity {
  switch ((raw || '').toUpperCase()) {
    case 'CRITICAL': return 'critical'
    case 'HIGH': return 'high'
    case 'MODERATE': case 'MEDIUM': return 'medium'
    case 'LOW': return 'low'
    default: return 'medium'
  }
}
interface OsvVuln { id?: string; summary?: string; database_specific?: { severity?: string } }
interface OsvPkg { package?: { name?: string; version?: string }; vulnerabilities?: OsvVuln[] }
interface OsvOut { results?: { packages?: OsvPkg[] }[] }
export function parseOsv(stdout: string): Finding[] {
  let data: OsvOut
  try { data = JSON.parse(stdout || '{}') } catch { return [] }
  const findings: Finding[] = []
  for (const result of data.results ?? []) {
    for (const pkg of result.packages ?? []) {
      const name = pkg.package?.name ?? 'dependency'
      const version = pkg.package?.version ?? ''
      for (const v of pkg.vulnerabilities ?? []) {
        findings.push({ source: 'internal', severity: mapSeverity(v.database_specific?.severity), title: `Vulnerable dependency: ${name}@${version} — ${v.summary || v.id || 'known CVE'}`, location: `${name}@${version}` })
      }
    }
  }
  return findings
}
export function runDepsScan(workdir: string): Finding[] {
  try {
    const out = execFileSync('osv-scanner', ['--format', 'json', '--recursive', workdir], { encoding: 'utf8' })
    return parseOsv(out)
  } catch (err) {
    const e = err as { stdout?: string }
    if (e.stdout) return parseOsv(e.stdout)
    core.warning('osv-scanner not available or failed; skipping dependency scan.')
    return []
  }
}
