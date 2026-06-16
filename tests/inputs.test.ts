import { test, expect } from 'vitest'
import { parseInputs } from '../src/inputs'
function withEnv(env: Record<string, string>, fn: () => void) {
  const prev = { ...process.env }
  Object.assign(process.env, env)
  try { fn() } finally { process.env = prev }
}
test('defaults: internal on, external off, depth light', () => {
  withEnv({}, () => {
    const cfg = parseInputs()
    expect(cfg.runInternal).toBe(true)
    expect(cfg.runExternal).toBe(false)
    expect(cfg.depth).toBe('light')
    expect(cfg.failOn).toBe('high')
  })
})
test('external enabled when key and target present; depth full opt-in', () => {
  withEnv({ 'INPUT_INTRUDR-API-KEY': 'k_live_x', 'INPUT_TARGET-URL': 'https://app.example.com', 'INPUT_DEPTH': 'full' }, () => {
    const cfg = parseInputs()
    expect(cfg.runExternal).toBe(true)
    expect(cfg.apiKey).toBe('k_live_x')
    expect(cfg.targetUrl).toBe('https://app.example.com')
    expect(cfg.depth).toBe('full')
  })
})
