import { execFileSync } from 'node:child_process'
import * as core from '@actions/core'
import type { Finding } from '../types'
interface GitleaksHit { RuleID?: string; File?: string; StartLine?: number; Description?: string }
export function parseGitleaks(stdout: string): Finding[] {
  let hits: GitleaksHit[]
  try { hits = JSON.parse(stdout || '[]') } catch { return [] }
  if (!Array.isArray(hits)) return []
  return hits.map(h => ({
    source: 'internal' as const,
    severity: 'high' as const,
    title: `Secret detected: ${h.Description || h.RuleID || 'credential'}`,
    location: h.File ? `${h.File}:${h.StartLine ?? 0}` : undefined,
  }))
}
export function runSecretsScan(workdir: string): Finding[] {
  try {
    const out = execFileSync('gitleaks', ['detect', '--no-banner', '--report-format', 'json', '--report-path', '/dev/stdout', '--source', workdir], { encoding: 'utf8' })
    return parseGitleaks(out)
  } catch (err) {
    const e = err as { stdout?: string }
    if (e.stdout) return parseGitleaks(e.stdout)
    core.warning('gitleaks not available or failed; skipping secret scan.')
    return []
  }
}
