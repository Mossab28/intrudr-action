import type { getOctokit } from '@actions/github'
import { COMMENT_MARKER } from './comment'

type Octokit = ReturnType<typeof getOctokit>
interface Target { owner: string; repo: string; issue_number: number }

export async function upsertComment(octokit: Octokit, target: Target, body: string): Promise<void> {
  const { data } = await octokit.rest.issues.listComments({
    owner: target.owner,
    repo: target.repo,
    issue_number: target.issue_number,
    per_page: 100,
  })
  const existing = data.find(c => (c.body ?? '').includes(COMMENT_MARKER))
  if (existing) {
    await octokit.rest.issues.updateComment({ owner: target.owner, repo: target.repo, comment_id: existing.id, body })
  } else {
    await octokit.rest.issues.createComment({ owner: target.owner, repo: target.repo, issue_number: target.issue_number, body })
  }
}
