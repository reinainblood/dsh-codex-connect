import { strict as assert } from 'node:assert'
import { assertReleaseCI } from './verify-release-ci.mjs'

const sha = 'a'.repeat(40)
const repository = 'fixture/project'
const run = { head_sha: sha, head_branch: 'main', repository: { full_name: repository }, path: '.github/workflows/ci.yml', event: 'push', status: 'completed', conclusion: 'success' }
const jobs = ['validate (22.19.0)', 'validate (24.x)', 'browser-ui-regression', 'windows-canary-contract'].map(name => ({ name, status: 'completed', conclusion: 'success' }))
assert.doesNotThrow(() => assertReleaseCI(run, jobs, sha, repository))
for (const change of [{ head_sha: 'b'.repeat(40) }, { status: 'in_progress' }, { conclusion: 'failure' }, { head_branch: 'other' }, { event: 'pull_request' }, { path: 'other.yml' }, { repository: { full_name: 'other/repo' } }]) {
  assert.throws(() => assertReleaseCI({ ...run, ...change }, jobs, sha, repository))
}
for (const conclusion of ['failure', 'skipped', 'cancelled']) {
  assert.throws(() => assertReleaseCI(run, jobs.map(job => job.name === 'browser-ui-regression' ? { ...job, conclusion } : job), sha, repository))
}
assert.throws(() => assertReleaseCI(run, jobs.filter(job => job.name !== 'browser-ui-regression'), sha, repository))
assert.throws(() => assertReleaseCI(run, jobs.map(job => ({ ...job, status: 'in_progress' })), sha, repository))
console.log('Release CI decision: 13 assertions passed')
