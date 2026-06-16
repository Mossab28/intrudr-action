import type { Finding } from '../types'
import type { ReconManifest } from './manifest-types'
interface Inputs { files: string[]; pkg: { dependencies?: Record<string, string> }; secrets: Finding[]; deps: Finding[] }
function routeFromPath(p: string): string | null {
  const m = p.match(/(?:src\/)?app\/(.+)\/route\.[tj]s$/)
  if (m) return '/' + m[1].replace(/\((.*?)\)\//g, '')
  const pages = p.match(/(?:src\/)?pages\/(.+)\.[tj]sx?$/)
  if (pages && !pages[1].startsWith('_')) return '/' + pages[1].replace(/\/index$/, '')
  return null
}
export function buildManifest(i: Inputs): ReconManifest {
  const deps = Object.entries(i.pkg.dependencies ?? {}).map(([name, version]) => ({ name, version, vuln: i.deps.some(d => d.location === `${name}@${version}`) }))
  const stack: string[] = []
  if (i.pkg.dependencies?.next) stack.push('next')
  if (i.pkg.dependencies?.['@prisma/client'] || i.pkg.dependencies?.prisma) stack.push('prisma')
  if (i.pkg.dependencies?.express) stack.push('express')
  return {
    stack,
    routes: i.files.map(routeFromPath).filter((r): r is string => Boolean(r)),
    deps,
    authHints: i.pkg.dependencies?.['next-auth'] ? ['nextauth'] : i.pkg.dependencies?.jsonwebtoken ? ['jwt'] : [],
    secretsCount: i.secrets.length,
  }
}
