# IntrudR Security Action

Scans your **code** and your **deployed app**, then posts one PR comment — IntrudR sees your app from both sides.

- **Internal (free, every PR):** secrets + vulnerable dependencies, in your CI. Open-source tools, never leaves your runner.
- **External (with an IntrudR key):** IntrudR scans your live app from the outside; the internal recon guides it.

## Usage

```yaml
name: Security
on: pull_request
permissions:
  contents: read
  pull-requests: write
jobs:
  intrudr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: intrudr/intrudr-action@v1
        with:
          intrudr-api-key: ${{ secrets.INTRUDR_API_KEY }}
          target-url: https://staging.example.com
          confirm-authorized: true
          depth: light
          fail-on: high
```

> `gitleaks` and `osv-scanner` are embedded — no extra setup steps needed.

Without `intrudr-api-key` / `target-url`, the Action runs **internal-only** and posts an upsell CTA.

## ⚠️ Authorization

**You are responsible for the targets you scan.** Scanning a target you do not own or are not authorized to test may be illegal and expose you to prosecution. Set `confirm-authorized: true` ONLY for targets you own or have written permission to test.

## Inputs

| Input | Default | Description |
|---|---|---|
| `intrudr-api-key` | — | IntrudR key. Omit for free internal-only. |
| `target-url` | — | Deployed URL to scan externally. |
| `confirm-authorized` | `false` | You confirm you own or are authorized to test target-url. Required for the external scan. |
| `depth` | `light` | `light` (fast/cheap) or `full` (deep, dashboard-grade). |
| `fail-on` | `high` | Fail the check at/above this severity. |
| `internal` | `true` | Run the internal scan. |
| `external` | `true` | Run the external scan when key + target are set. |

## Controlling cadence (you decide, billed in credits)

The internal scan runs on **every PR** (free). You choose **when** the external scan runs — each external run spends IntrudR credits. Common patterns:

```yaml
# Only on PRs targeting main:
- uses: intrudr/intrudr-action@v1
  if: github.event.pull_request.base.ref == 'main'
  with: { intrudr-api-key: ${{ secrets.INTRUDR_API_KEY }}, target-url: https://staging.example.com }

# Deep scan only when a 'deep-scan' label is on the PR:
- uses: intrudr/intrudr-action@v1
  if: contains(github.event.pull_request.labels.*.name, 'deep-scan')
  with: { intrudr-api-key: ${{ secrets.INTRUDR_API_KEY }}, target-url: https://staging.example.com, depth: full }
```

## Tiers

| Tier | Internal | External | Notes |
|---|---|---|---|
| Free | ✅ every PR | 1 free scan | taste of internal+external |
| Hunter | ✅ | ✅ | credits-based volume |
| Arsenal | ✅ | ✅ | more credits, deep mode, parallel |
