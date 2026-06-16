import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import * as core from '@actions/core'
import * as github from '@actions/github'
import { parseInputs, type Config } from './inputs'
import { runSecretsScan } from './internal/secrets'
import { runDepsScan } from './internal/deps'
import { buildManifest } from './internal/manifest'
import type { ReconManifest } from './internal/manifest-types'
import { submitCiScan, pollScan } from './api/client'
import { renderComment } from './report/comment'
import { upsertComment } from './report/publish'
import { shouldFail } from './report/gate'
import type { Finding } from './types'

export interface RunDeps {
  config: Config
  runSecretsScan: (workdir: string) => Finding[]
  runDepsScan: (workdir: string) => Finding[]
  listFiles: (workdir: string) => string[]
  readPkg: (workdir: string) => { dependencies?: Record<string, string> }
  buildManifest: (i: { files: string[]; pkg: { dependencies?: Record<string, string> }; secrets: Finding[]; deps: Finding[] }) => ReconManifest
  submitCiScan: typeof submitCiScan
  pollScan: typeof pollScan
  publish: (body: string) => Promise<void>
  workdir: string
}

export async function run(deps: RunDeps): Promise<{ failed: boolean }> {
  const { config } = deps
  const secrets = config.runInternal ? deps.runSecretsScan(deps.workdir) : []
  const depFindings = config.runInternal ? deps.runDepsScan(deps.workdir) : []
  const internal = [...secrets, ...depFindings]

  let external: Finding[] = []
  let reportUrl: string | null = null
  let riskScore: number | null = null
  let externalRan = false

  if (config.runExternal) {
    const manifest = deps.buildManifest({
      files: deps.listFiles(deps.workdir),
      pkg: deps.readPkg(deps.workdir),
      secrets,
      deps: depFindings,
    })
    const sub = await deps.submitCiScan({
      apiBaseUrl: config.apiBaseUrl,
      apiKey: config.apiKey,
      target: config.targetUrl,
      depth: config.depth,
      manifest,
    })
    const result = await deps.pollScan({ apiBaseUrl: config.apiBaseUrl, apiKey: config.apiKey, id: sub.id })
    external = result.findings
    reportUrl = result.reportUrl ?? sub.reportUrl
    riskScore = result.riskScore
    externalRan = true
  }

  const body = renderComment({ internal, external, externalRan, reportUrl, riskScore })
  await deps.publish(body)
  return { failed: shouldFail([...internal, ...external], config.failOn) }
}

// Metadata only: relative file paths, skipping node_modules/.git/dist. Never reads source contents.
function listFiles(workdir: string): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    let entries: string[]
    try { entries = readdirSync(dir) } catch { return }
    for (const e of entries) {
      if (e === 'node_modules' || e === '.git' || e === 'dist') continue
      const full = join(dir, e)
      let st
      try { st = statSync(full) } catch { continue }
      if (st.isDirectory()) walk(full)
      else out.push(relative(workdir, full))
    }
  }
  walk(workdir)
  return out
}

function readPkg(workdir: string): { dependencies?: Record<string, string> } {
  try { return JSON.parse(readFileSync(join(workdir, 'package.json'), 'utf8')) } catch { return {} }
}

async function main(): Promise<void> {
  try {
    const config = parseInputs()
    const octokit = github.getOctokit(config.githubToken)
    const pr = github.context.payload.pull_request?.number
    const result = await run({
      config,
      runSecretsScan,
      runDepsScan,
      listFiles,
      readPkg,
      buildManifest,
      submitCiScan,
      pollScan,
      workdir: process.env.GITHUB_WORKSPACE ?? process.cwd(),
      publish: async (body) => {
        if (!pr) { core.info('Not a pull_request event — skipping comment.'); return }
        await upsertComment(
          octokit,
          { owner: github.context.repo.owner, repo: github.context.repo.repo, issue_number: pr },
          body,
        )
      },
    })
    if (result.failed) core.setFailed('Security findings exceed the fail-on threshold.')
  } catch (err) {
    core.setFailed(err instanceof Error ? err.message : String(err))
  }
}

if (process.env.NODE_ENV !== 'test') void main()
