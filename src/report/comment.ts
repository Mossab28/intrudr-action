import { SEVERITY_ORDER, type Finding } from '../types'

export const COMMENT_MARKER = '<!-- intrudr-action -->'

interface CommentInput { internal: Finding[]; external: Finding[]; externalRan: boolean; externalFailed?: boolean; reportUrl: string | null; riskScore: number | null }

function countBySeverity(findings: Finding[]): string {
  const counts = SEVERITY_ORDER.map(s => [s, findings.filter(f => f.severity === s).length] as const).filter(([, n]) => n > 0)
  if (counts.length === 0) return 'no findings ✅'
  return counts.map(([s, n]) => `${n} ${s}`).join(' · ')
}

function table(findings: Finding[]): string {
  if (findings.length === 0) return '_No findings._'
  const rows = findings.slice()
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
    .slice(0, 20)
    .map(f => `| \`${f.severity}\` | ${f.title} | ${f.location ?? '—'} |`)
    .join('\n')
  return `| Severity | Finding | Location |\n|---|---|---|\n${rows}`
}

export function renderComment(input: CommentInput): string {
  const badgeScore = input.riskScore != null ? `${input.riskScore}` : 'internal'
  const badgeColor = input.riskScore != null && input.riskScore >= 70 ? 'red' : input.riskScore != null && input.riskScore >= 40 ? 'orange' : 'green'
  const badge = `![IntrudR](https://img.shields.io/badge/IntrudR-${encodeURIComponent(badgeScore)}-${badgeColor})`
  const external = input.externalRan
    ? input.externalFailed
      ? `### 🌐 External scan (your live app)\n⚠️ External scan failed — see IntrudR for details.${input.reportUrl ? `\n\n[Open report →](${input.reportUrl})` : ''}`
      : `### 🌐 External scan (your live app)\n${countBySeverity(input.external)}\n\n${table(input.external)}\n\n${input.reportUrl ? `[Open full report →](${input.reportUrl})` : ''}`
    : `### 🌐 External scan\n_Not run._ **Add an IntrudR API key** and a \`target-url\` to also scan your deployed app from the outside — IntrudR then sees your app from both sides. → https://intrudr.io/pricing`
  return [
    COMMENT_MARKER,
    `## ${badge} Security scan`,
    '',
    `### 🔒 Internal scan (your repo)`,
    countBySeverity(input.internal),
    '',
    table(input.internal),
    '',
    external,
    '',
    `<sub>Internal = secrets + dependencies (open-source). External = IntrudR engine. Comment updates on each push.</sub>`,
  ].join('\n')
}
