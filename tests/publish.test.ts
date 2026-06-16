import { test, expect, vi } from 'vitest'
import { upsertComment } from '../src/report/publish'
import { COMMENT_MARKER } from '../src/report/comment'

function fakeOctokit(existing: Array<{ id: number; body: string }>) {
  return { rest: { issues: { listComments: vi.fn(async () => ({ data: existing })), createComment: vi.fn(async () => ({})), updateComment: vi.fn(async () => ({})) } } }
}

test('creates a new comment when none exists', async () => {
  const ok = fakeOctokit([])
  await upsertComment(ok as never, { owner: 'o', repo: 'r', issue_number: 1 }, `${COMMENT_MARKER}\nbody`)
  expect(ok.rest.issues.createComment).toHaveBeenCalled()
  expect(ok.rest.issues.updateComment).not.toHaveBeenCalled()
})

test('updates the existing IntrudR comment', async () => {
  const ok = fakeOctokit([{ id: 99, body: `${COMMENT_MARKER}\nold` }])
  await upsertComment(ok as never, { owner: 'o', repo: 'r', issue_number: 1 }, `${COMMENT_MARKER}\nnew`)
  expect(ok.rest.issues.updateComment).toHaveBeenCalledWith(expect.objectContaining({ comment_id: 99 }))
})
