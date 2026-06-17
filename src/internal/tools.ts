import { execSync } from 'node:child_process'
import { mkdtempSync, chmodSync, createWriteStream } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as https from 'node:https'
import * as core from '@actions/core'

// Pinned stable versions
const GITLEAKS_VERSION = '8.21.2'
const OSV_SCANNER_VERSION = '1.9.2'

export function toolDownloadUrl(tool: 'gitleaks' | 'osv-scanner', platform = process.platform, arch = process.arch): string {
  if (tool === 'gitleaks') {
    // gitleaks_8.21.2_linux_x64.tar.gz
    const goArch = arch === 'x64' ? 'x64' : arch === 'arm64' ? 'arm64' : 'x64'
    const goos = platform === 'darwin' ? 'darwin' : 'linux'
    return `https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_${goos}_${goArch}.tar.gz`
  }
  // osv-scanner — single binary
  const goArch = arch === 'arm64' ? 'arm64' : 'amd64'
  const goos = platform === 'darwin' ? 'darwin' : 'linux'
  return `https://github.com/google/osv-scanner/releases/download/v${OSV_SCANNER_VERSION}/osv-scanner_${goos}_${goArch}`
}

function isOnPath(cmd: string): boolean {
  try { execSync(`which ${cmd}`, { stdio: 'ignore' }); return true } catch { return false }
}

async function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest)
    const get = (u: string) => https.get(u, res => {
      if (res.statusCode === 301 || res.statusCode === 302) { get(res.headers.location!); return }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode} for ${u}`)); return }
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve()))
    }).on('error', reject)
    get(url)
  })
}

async function installGitleaks(dir: string): Promise<void> {
  const tarPath = join(dir, 'gitleaks.tar.gz')
  await download(toolDownloadUrl('gitleaks'), tarPath)
  execSync(`tar -xzf ${tarPath} -C ${dir} gitleaks`)
  chmodSync(join(dir, 'gitleaks'), 0o755)
}

async function installOsvScanner(dir: string): Promise<void> {
  const dest = join(dir, 'osv-scanner')
  await download(toolDownloadUrl('osv-scanner'), dest)
  chmodSync(dest, 0o755)
}

export async function ensureTools(): Promise<void> {
  const needGitleaks = !isOnPath('gitleaks')
  const needOsv = !isOnPath('osv-scanner')
  if (!needGitleaks && !needOsv) return

  const dir = mkdtempSync(join(tmpdir(), 'intrudr-tools-'))
  core.addPath(dir)

  const tasks: Promise<void>[] = []
  if (needGitleaks) {
    tasks.push(
      installGitleaks(dir).catch(e => { core.warning(`gitleaks download failed: ${e.message} — internal secrets scan will be skipped`) }),
    )
  }
  if (needOsv) {
    tasks.push(
      installOsvScanner(dir).catch(e => { core.warning(`osv-scanner download failed: ${e.message} — deps scan will be skipped`) }),
    )
  }
  await Promise.all(tasks)
}
