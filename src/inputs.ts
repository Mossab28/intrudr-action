import * as core from '@actions/core'
import type { Severity } from './types'

export interface Config {
  apiKey: string
  targetUrl: string
  depth: 'light' | 'full'
  failOn: Severity
  runInternal: boolean
  runExternal: boolean
  confirmAuthorized: boolean
  apiBaseUrl: string
  githubToken: string
}

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'info']

export function parseInputs(): Config {
  const apiKey = core.getInput('intrudr-api-key')
  const targetUrl = core.getInput('target-url')
  const depth = core.getInput('depth') === 'full' ? 'full' : 'light'
  const failOnRaw = (core.getInput('fail-on') || 'high').toLowerCase()
  const failOn = (SEVERITIES.includes(failOnRaw as Severity) ? failOnRaw : 'high') as Severity
  const internalIn = core.getInput('internal')
  const externalIn = core.getInput('external')
  const runInternal = internalIn ? internalIn === 'true' : true
  const externalRequested = externalIn ? externalIn === 'true' : true
  const runExternal = externalRequested && Boolean(apiKey) && Boolean(targetUrl)
  const confirmAuthorized = core.getInput('confirm-authorized') === 'true'
  return {
    apiKey, targetUrl, depth, failOn, runInternal, runExternal, confirmAuthorized,
    apiBaseUrl: core.getInput('api-base-url') || 'https://intrudr.io',
    githubToken: core.getInput('github-token'),
  }
}
