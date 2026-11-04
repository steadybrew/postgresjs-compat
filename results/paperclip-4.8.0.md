# Paperclip on @steadybrew/postgresjs 4.8.0

Run on 2026-11-04 with `@steadybrew/postgresjs-migrate` 0.2.0 and the PostgreSQL that Paperclip's tests start themselves ([workflow run](https://github.com/steadybrew/postgresjs-compat/actions/runs/41901324400)).

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
| [Full test suite](https://github.com/paperclipai/paperclip/tree/bba6a45f0d364cfd962ac59b3bdf2426a8222adb) | v2026.1012.0 | as published, upstream 4.0.0 | 29844 | 8 | 0 | 1 |

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

- 3.4.9: `postgres@3.4.9`: 12 failed; Node v24.22.2; embedded-postgres@18.1.0-beta.16 (patched) in packages/db; drizzle-orm@0.45.2 in packages/db
- As published: `postgres@3.4.9 (patched)`: 12 passed; Node v24.22.2; embedded-postgres@18.1.0-beta.16 (patched) in packages/db; drizzle-orm@0.45.2 in packages/db
- Fork: `@steadybrew/postgresjs@4.8.0`: 12 passed; Node v24.22.1; embedded-postgres@18.1.0-beta.16 (patched) in packages/db; drizzle-orm@0.45.2 in packages/db
- Upstream 4.0.0: `postgres@4.0.0`: 6 passed, 6 failed; Node v24.22.2; embedded-postgres@18.1.0-beta.16 (patched) in packages/db; drizzle-orm@0.45.2 in packages/db
- Upstream c32cf5a: [porsager/postgres@c32cf5a](https://github.com/porsager/postgres/tree/c32cf5ac852f4f02150d3cc03f34621cc86a03b7): 9 failed, 3 passed; Node v24.22.1; embedded-postgres@18.1.0-beta.16 (patched) in packages/db; drizzle-orm@0.45.2 in packages/db

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

- `step: test`: `Start at  19:55:08 / Duration  6.84s (transform 679ms, setup 0ms, import 2.38s, tests 4.33s, environment 0ms) / JSON report written to /home/runner/work/postgresjs-compat/postgresjs-compat/out/vitest.json`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-HdThif/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-closed work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-HdThif/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected savepoint work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-HdThif/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-HdThif/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-queue work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-HdThif/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve-queue work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-HdThif/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`

### Fixed by upstream `postgres` 4.0.0

- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction-closed work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected savepoint work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected reserve work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction-queue work and recovers the pool`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected reserve-queue work and recovers the pool`

### Regressions with upstream porsager/postgres c32cf5a

- `step: test`: `Start at  19:58:30 / Duration  5.33s (transform 396ms, setup 0ms, import 1.66s, tests 3.58s, environment 0ms) / JSON report written to /home/runner/work/postgresjs-compat/postgresjs-compat/out/vitest.json`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-t2l3lr/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction-closed work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-t2l3lr/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected savepoint work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-t2l3lr/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-t2l3lr/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-closed work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-t2l3lr/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected savepoint work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-t2l3lr/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-t2l3lr/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-queue work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-t2l3lr/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve-queue work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-t2l3lr/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`

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

- `step: test #18`: `Duration  128.03s (transform 2.77s, setup 0ms, import 65.89s, tests 305.95s, environment 8ms) / JSON report written to /home/runner/work/postgresjs-compat/postgresjs-compat/out/vitest-3273-1793823166344.json / ELIFECYCLE  Command failed with exit code 1.`
- `step: test #28`: `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @paperclipai/db@0.3.1 typecheck: 'pnpm run check:migrations && tsc --noEmit' / Exit status 1 / ELIFECYCLE  Command failed with exit code 1.`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-zjxLai/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-closed work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-zjxLai/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected savepoint work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-zjxLai/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-zjxLai/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-queue work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-zjxLai/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve-queue work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.1/x64/bin/node /home/runner/work/_temp/compat-zjxLai/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`

### Failing on both with upstream `postgres` 4.0.0

- `<tmp>/server/src/__tests__/chat-channels.integration.test.ts > fails`: a test in a throwaway project that the chat suite runs to check its own sharding; it fails on purpose.

### Regressions with upstream porsager/postgres c32cf5a

- `step: test #18`: `Duration  116.61s (transform 2.91s, setup 0ms, import 60.71s, tests 278.31s, environment 6ms) / JSON report written to /home/runner/work/postgresjs-compat/postgresjs-compat/out/vitest-3365-1793822949229.json / ELIFECYCLE  Command failed with exit code 1.`
- `step: test #28`: `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @paperclipai/db@0.3.1 typecheck: 'pnpm run check:migrations && tsc --noEmit' / Exit status 1 / ELIFECYCLE  Command failed with exit code 1.`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-jBX6PR/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction-closed work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-jBX6PR/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected savepoint work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-jBX6PR/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-jBX6PR/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-closed work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-jBX6PR/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected savepoint work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-jBX6PR/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-jBX6PR/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-queue work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-jBX6PR/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`
- `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve-queue work and recovers the pool`: `Error: Command failed: /opt/hostedtoolcache/node/24.22.2/x64/bin/node /home/runner/work/_temp/compat-jBX6PR/repo/packages/db/src/__fixtures__/postgres-connection-recovery.mjs`

### Failing on both with upstream porsager/postgres c32cf5a

- `<tmp>/server/src/__tests__/chat-channels.integration.test.ts > fails`: a test in a throwaway project that the chat suite runs to check its own sharding; it fails on purpose.
