export interface ReconManifest {
  stack: string[]
  routes: string[]
  deps: { name: string; version: string; vuln?: boolean }[]
  authHints?: string[]
  secretsCount: number
}
