# Paperclip on @steadybrew/postgresjs 4.8.0

Run on 2026-11-04 with `@steadybrew/postgresjs-migrate` 0.2.0 and the PostgreSQL that Paperclip's tests start themselves ([workflow run](https://github.com/steadybrew/postgresjs-compat/actions/runs/41880061820)).

Paperclip's tests run in up to 5 ways, each in its own job with a fresh install:

- **3.4.9**: plain `postgres` 3.4.9. The switch tool removes Paperclip's `postgres` patch, so this run has none.
- **As published**: Paperclip exactly as published, with its own patched `postgres`.
- **Fork**: `@steadybrew/postgresjs` 4.8.0, with Paperclip's patch removed.
- **Upstream 4.0.0**: `postgres@4.0.0` in place of the fork, with the same switch and patch removal.
- **Upstream c32cf5a**: [porsager/postgres@c32cf5a](https://github.com/porsager/postgres/tree/c32cf5ac852f4f02150d3cc03f34621cc86a03b7) in place of the fork, with the same switch and patch removal.

A regression is a test that passes with 3.4.9 or as published, and fails with the fork or upstream run it is counted for. The other counts compare that run with 3.4.9, or with the published Paperclip when there is no 3.4.9 run.

## Fork: `@steadybrew/postgresjs@4.8.0`

| Tests | Version | Runs | Passing on both | Regressions | Fixed by the fork | Failing on both |
| --- | --- | --- | --- | --- | --- | --- |
| [Recovery tests](https://github.com/paperclipai/paperclip/tree/bba6a45f0d364cfd962ac59b3bdf2426a8222adb) | v2026.1012.0 | 3.4.9, as published, fork | 0 | 0 | 12 | 0 |
| [Full test suite](https://github.com/paperclipai/paperclip/tree/bba6a45f0d364cfd962ac59b3bdf2426a8222adb) | v2026.1012.0 | as published, fork | 29850 | 0 | 0 | 1 |

## Upstream 4.0.0: `postgres@4.0.0`

| Tests | Version | Runs | Passing on both | Regressions | Fixed by upstream `postgres` 4.0.0 | Failing on both |
| --- | --- | --- | --- | --- | --- | --- |
| [Recovery tests](https://github.com/paperclipai/paperclip/tree/bba6a45f0d364cfd962ac59b3bdf2426a8222adb) | v2026.1012.0 | 3.4.9, as published, upstream 4.0.0 | 0 | 7 | 6 | 0 |
| [Full test suite](https://github.com/paperclipai/paperclip/tree/bba6a45f0d364cfd962ac59b3bdf2426a8222adb) | v2026.1012.0 | as published, upstream 4.0.0 | 29802 | 51 | 0 | 1 |

## Upstream c32cf5a: [porsager/postgres@c32cf5a](https://github.com/porsager/postgres/tree/c32cf5ac852f4f02150d3cc03f34621cc86a03b7)

| Tests | Version | Runs | Passing on both | Regressions | Fixed by upstream porsager/postgres c32cf5a | Failing on both |
| --- | --- | --- | --- | --- | --- | --- |
| [Recovery tests](https://github.com/paperclipai/paperclip/tree/bba6a45f0d364cfd962ac59b3bdf2426a8222adb) | v2026.1012.0 | 3.4.9, as published, upstream c32cf5a | 0 | 10 | 3 | 0 |
| [Full test suite](https://github.com/paperclipai/paperclip/tree/bba6a45f0d364cfd962ac59b3bdf2426a8222adb) | v2026.1012.0 | as published, upstream c32cf5a | 29841 | 11 | 0 | 1 |

## Recovery tests

Paperclip's 12 connection recovery tests in `packages/db/src/postgres-connection-recovery.test.ts`: six disconnect scenarios, each through ESM and CommonJS. On the fork one line of their fixture is changed: after `release()` on a reserved connection that had already closed, the check expects `CONNECTION_RELEASED` instead of `CONNECTION_CLOSED`. The diff is in the fork job's `prepare.diff`.

### All runs

| Test | 3.4.9: `postgres@3.4.9` | As published: `postgres@3.4.9 (patched)` | Fork: `@steadybrew/postgresjs@4.8.0` | Upstream 4.0.0: `postgres@4.0.0` | Upstream c32cf5a: [porsager/postgres@c32cf5a](https://github.com/porsager/postgres/tree/c32cf5ac852f4f02150d3cc03f34621cc86a03b7) |
| --- | --- | --- | --- | --- | --- |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve work and recovers the pool` | failed | passed | passed | failed | failed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve-queue work and recovers the pool` | failed | passed | passed | failed | failed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected savepoint work and recovers the pool` | failed | passed | passed | failed | failed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction work and recovers the pool` | failed | passed | passed | failed | failed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-closed work and recovers the pool` | failed | passed | passed | failed | failed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-queue work and recovers the pool` | failed | passed | passed | failed | failed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected reserve work and recovers the pool` | failed | passed | passed | passed | passed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected reserve-queue work and recovers the pool` | failed | passed | passed | passed | passed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected savepoint work and recovers the pool` | failed | passed | passed | passed | failed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction work and recovers the pool` | failed | passed | passed | passed | failed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction-closed work and recovers the pool` | failed | passed | passed | passed | failed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction-queue work and recovers the pool` | failed | passed | passed | passed | passed |

- 3.4.9: `postgres@3.4.9`: 12 failed; Node v24.22.1; embedded-postgres@18.1.0-beta.16 (patched) in packages/db; drizzle-orm@0.45.2 in packages/db
- As published: `postgres@3.4.9 (patched)`: 12 passed; Node v24.22.2; embedded-postgres@18.1.0-beta.16 (patched) in packages/db; drizzle-orm@0.45.2 in packages/db
- Fork: `@steadybrew/postgresjs@4.8.0`: 12 passed; Node v24.22.2; embedded-postgres@18.1.0-beta.16 (patched) in packages/db; drizzle-orm@0.45.2 in packages/db
- Upstream 4.0.0: `postgres@4.0.0`: 6 passed, 6 failed; Node v24.22.1; embedded-postgres@18.1.0-beta.16 (patched) in packages/db; drizzle-orm@0.45.2 in packages/db
- Upstream c32cf5a: [porsager/postgres@c32cf5a](https://github.com/porsager/postgres/tree/c32cf5ac852f4f02150d3cc03f34621cc86a03b7): 9 failed, 3 passed; Node v24.22.2; embedded-postgres@18.1.0-beta.16 (patched) in packages/db; drizzle-orm@0.45.2 in packages/db

### Fixed by the fork

- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction-closed work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected savepoint work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected reserve work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction-queue work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected reserve-queue work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-closed work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected savepoint work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-queue work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve-queue work and recovers the pool`

### Regressions with upstream `postgres` 4.0.0

- `step: test`: `Start at  17:45:44 / Duration  6.19s (transform 613ms, setup 0ms, import 1.92s, tests 4.14s, environment 0ms) / JSON report written to /home/runner/work/postgresjs-compat/postgresjs-compat/out/vitest.json`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-GzFr06/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-closed work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-GzFr06/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected savepoint work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-GzFr06/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-GzFr06/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-queue work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-GzFr06/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve-queue work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-GzFr06/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`

### Fixed by upstream `postgres` 4.0.0

- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction-closed work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected savepoint work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected reserve work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction-queue work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected reserve-queue work and recovers the pool`

### Regressions with upstream porsager/postgres c32cf5a

- `step: test`: `Start at  17:55:08 / Duration  6.20s (transform 525ms, setup 0ms, import 1.96s, tests 4.14s, environment 0ms) / JSON report written to /home/runner/work/postgresjs-compat/postgresjs-compat/out/vitest.json`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-VCas8G/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction-closed work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-VCas8G/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected savepoint work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-VCas8G/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-VCas8G/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-closed work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-VCas8G/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected savepoint work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-VCas8G/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-VCas8G/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-queue work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-VCas8G/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve-queue work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-VCas8G/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`

### Fixed by upstream porsager/postgres c32cf5a

- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected reserve work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction-queue work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected reserve-queue work and recovers the pool`

## Full test suite

The general and serialized test lanes of Paperclip's PR workflow, sharded as that workflow shards them, plus typecheck and build. A test that runs in more than one shard counts once. On the fork, the recovery fixture has the same one-line change as the recovery tests.

This runs no 3.4.9 job. Its columns compare each run with the checkout as published, which uses `postgres@3.4.9 (patched)`.

### Failing on both

- `<tmp>/server/src/__tests__/chat-channels.integration.test.ts > fails`: a test in a throwaway project that the chat suite runs to check its own sharding; it fails on purpose.

### Regressions with upstream `postgres` 4.0.0

- `step: test #18`: `Duration  132.60s (transform 2.87s, setup 0ms, import 66.22s, tests 319.92s, environment 7ms) / JSON report written to /home/runner/work/postgresjs-compat/postgresjs-compat/out/vitest-3320-1793816065737.json / ELIFECYCLE  Command failed with exit code 1.`
- `step: test #19`: `Duration  182.83s (transform 7.88s, setup 66ms, import 11.32s, tests 171.33s, environment 0ms) / JSON report written to /home/runner/work/postgresjs-compat/postgresjs-compat/out/vitest-3103-1793815188031.json / ELIFECYCLE  Command failed with exit code 1.`
- `step: test #28`: `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @paperclipai/db@0.3.1 typecheck: 'pnpm run check:migrations && tsc --noEmit' / Exit status 1 / ELIFECYCLE  Command failed with exit code 1.`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-wKRNtD/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-closed work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-wKRNtD/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected savepoint work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-wKRNtD/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-wKRNtD/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-queue work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-wKRNtD/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve-queue work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-wKRNtD/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `server/src/__tests__/heartbeat-process-recovery.test.ts > heartbeat orphaned process recovery > redacts opaque environment-bound credentials from Sentry diagnostics: throw`: `AssertionError: expected '***REDACTED*** rejected ***REDACTED***' to contain 'upstream rejected'`
- `server/src/__tests__/heartbeat-process-recovery.test.ts > heartbeat orphaned process recovery > redacts opaque environment-bound credentials from Sentry diagnostics: result`: `AssertionError: expected '***REDACTED*** rejected ***REDACTED***' to contain 'upstream rejected'`
- `server/src/__tests__/invite-accept-existing-member.test.ts > POST /invites/:token/accept > does not consume a human invite when the signed-in user is already a company member`
- `server/src/__tests__/invite-accept-existing-member.test.ts > POST /invites/:token/accept > rejects Paperclip Runner before an agent invite creates a join request`
- `server/src/__tests__/invite-accept-existing-member.test.ts > POST /invites/:token/accept > grants company access immediately for a human invite`
- `server/src/__tests__/invite-accept-existing-member.test.ts > POST /invites/:token/accept > replays a consumed human invite for the same user and repairs company access`
- `server/src/__tests__/task-title-routes.test.ts > task titles > creates a provisional title from the prompt through the API and preserves the full description`
- `server/src/__tests__/task-title-routes.test.ts > task titles > removes leading Markdown before truncating a provisional title`
- `server/src/__tests__/task-title-routes.test.ts > task titles > falls back to a simple title if parseMarkdown throws`
- `server/src/__tests__/task-title-routes.test.ts > task titles > falls back to a simple title if markdownToPlainText throws`
- `server/src/__tests__/task-title-routes.test.ts > task titles > creates prompt-only children and still accepts explicit child titles`
- `server/src/__tests__/task-title-routes.test.ts > task titles > bounds title receipts without evicting replay protection across native and HTTP calls`
- `server/src/__tests__/task-title-routes.test.ts > task titles > keeps distinct prompts with the same prefix and replays creation keys after naming`
- `server/src/__tests__/task-title-routes.test.ts > task titles > names the active task once in standard mode without changing execution`
- `server/src/__tests__/task-title-routes.test.ts > task titles > names the active task once in ask mode without changing execution`
- `server/src/__tests__/task-title-routes.test.ts > task titles > names the active task once in planning mode without changing execution`
- `server/src/__tests__/task-title-routes.test.ts > task titles > preserves a user edit and supports intentional renaming through the shared MCP/API path`
- `server/src/__tests__/task-title-routes.test.ts > task titles > fences simultaneous initial titles and later retries`
- `server/src/__tests__/task-title-routes.test.ts > task titles > shares native title receipts with the other surface without overwriting later user edits`
- `server/src/__tests__/task-title-routes.test.ts > task titles > shares http title receipts with the other surface without overwriting later user edits`
- `server/src/__tests__/task-title-routes.test.ts > task titles > refreshes external title links through native and REST renames while preserving description links`
- `server/src/__tests__/task-title-routes.test.ts > task titles > rejects unrelated tasks, stale runs, and malformed title mutations`
- `server/src/__tests__/user-profile-routes.test.ts > GET /companies/:companyId/users/:userSlug/profile > resolves a user slug and returns issue, activity, and attributed cost stats`
- `server/src/__tests__/workspace-command-authz.test.ts > workspace host-command mutation detection > detects 'project execution policy commands'`
- `server/src/__tests__/workspace-command-authz.test.ts > workspace host-command mutation detection > detects 'project execution policy services'`
- `server/src/__tests__/workspace-command-authz.test.ts > workspace host-command mutation detection > detects 'project workspace jobs'`
- `server/src/__tests__/workspace-command-authz.test.ts > workspace host-command mutation detection > detects 'issue execution workspace services'`
- `server/src/__tests__/workspace-command-authz.test.ts > workspace host-command mutation detection > detects 'execution workspace config commands'`
- `server/src/__tests__/workspace-command-authz.test.ts > workspace host-command mutation detection > detects 'execution workspace metadata jobs'`
- `server/src/__tests__/workspace-command-authz.test.ts > workspace host-command mutation detection > ignores descriptive runtime entries without a command field`
- `server/src/__tests__/workspace-runtime-routes-authz.test.ts > workspace runtime service route authorization > rejects agent callers for project workspace runtime service mutations when workspace auth denies access`
- `server/src/__tests__/workspace-runtime-routes-authz.test.ts > workspace runtime service route authorization > rejects skill_test keys at the central runtime-manage gate for project and execution workspaces`
- `server/src/__tests__/workspace-runtime-routes-authz.test.ts > workspace runtime service route authorization > rejects task_bridge keys at the central runtime-manage gate for project and execution workspaces`
- `server/src/__tests__/workspace-runtime-routes-authz.test.ts > workspace runtime service route authorization > blocks shared-project stop/restart requests from agents`
- `server/src/__tests__/workspace-runtime-routes-authz.test.ts > workspace runtime service route authorization > rejects agent callers that create project execution workspace commands`
- `server/src/__tests__/workspace-runtime-routes-authz.test.ts > workspace runtime service route authorization > rejects agent callers that persist workspace-runtime service commands`
- `server/src/__tests__/workspace-runtime-routes-authz.test.ts > workspace runtime service route authorization > rejects agent callers that update project workspace cleanup commands`
- `server/src/__tests__/workspace-runtime-routes-authz.test.ts > workspace runtime service route authorization > allows board callers through the project workspace runtime auth gate`
- `server/src/__tests__/workspace-runtime-routes-authz.test.ts > workspace runtime service route authorization > rejects agent callers for execution workspace runtime service mutations when workspace auth denies access`
- `server/src/__tests__/workspace-runtime-routes-authz.test.ts > workspace runtime service route authorization > rejects agent callers that patch execution workspace command config`
- `server/src/__tests__/workspace-runtime-routes-authz.test.ts > workspace runtime service route authorization > rejects agent callers that smuggle execution workspace commands through metadata.config`
- `server/src/__tests__/workspace-runtime-routes-authz.test.ts > workspace runtime service route authorization > allows board callers through the execution workspace runtime auth gate`

### Failing on both with upstream `postgres` 4.0.0

- `<tmp>/server/src/__tests__/chat-channels.integration.test.ts > fails`: a test in a throwaway project that the chat suite runs to check its own sharding; it fails on purpose.

### Regressions with upstream porsager/postgres c32cf5a

- `step: test #18`: `Duration  129.85s (transform 2.75s, setup 0ms, import 66.14s, tests 313.02s, environment 7ms) / JSON report written to /home/runner/work/postgresjs-compat/postgresjs-compat/out/vitest-3263-1793815929876.json / ELIFECYCLE  Command failed with exit code 1.`
- `step: test #28`: `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @paperclipai/db@0.3.1 typecheck: 'pnpm run check:migrations && tsc --noEmit' / Exit status 1 / ELIFECYCLE  Command failed with exit code 1.`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-IPOjNs/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction-closed work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-IPOjNs/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected savepoint work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-IPOjNs/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-IPOjNs/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-closed work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-IPOjNs/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected savepoint work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-IPOjNs/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-IPOjNs/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-queue work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-IPOjNs/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve-queue work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-IPOjNs/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`

### Failing on both with upstream porsager/postgres c32cf5a

- `<tmp>/server/src/__tests__/chat-channels.integration.test.ts > fails`: a test in a throwaway project that the chat suite runs to check its own sharding; it fails on purpose.
