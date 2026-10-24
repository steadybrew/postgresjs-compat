# Paperclip on @steadybrew/postgresjs 4.6.0

Run on 2026-10-22 with `@steadybrew/postgresjs-migrate` 0.1.1 and the PostgreSQL that Paperclip's tests start themselves ([workflow run](https://github.com/steadybrew/postgresjs-compat/actions/runs/39859807245)).

Paperclip's tests run in up to three ways, each in its own job with a fresh install:

- **3.4.9**: plain `postgres` 3.4.9. The switch tool removes Paperclip's `postgres` patch, so this run has none.
- **As published**: Paperclip exactly as published, with its own patched `postgres`.
- **Fork**: `@steadybrew/postgresjs` 4.6.0, with Paperclip's patch removed.

A regression is a test that passes with 3.4.9 or as published, and fails with the fork. The other counts compare the fork with 3.4.9, or with the published Paperclip when there is no 3.4.9 run.

| Tests | Version | Runs | Passing on both | Regressions | Fixed by the fork | Failing on both |
| --- | --- | --- | --- | --- | --- | --- |
| [Recovery tests](https://github.com/paperclipai/paperclip/tree/bba6a45f0d364cfd962ac59b3bdf2426a8222adb) | v2026.1012.0 | 3.4.9, as published, fork | 0 | 0 | 12 | 0 |
| [Full test suite](https://github.com/paperclipai/paperclip/tree/bba6a45f0d364cfd962ac59b3bdf2426a8222adb) | v2026.1012.0 | as published, fork | 29850 | 0 | 0 | 1 |

## Recovery tests

Paperclip's 12 connection recovery tests in `packages/db/src/postgres-connection-recovery.test.ts`, unchanged: six disconnect scenarios, each through ESM and CommonJS.

### All three runs

| Test | 3.4.9: `postgres@3.4.9` | As published: `postgres@3.4.9 (patched)` | Fork: `@steadybrew/postgresjs@4.6.0` |
| --- | --- | --- | --- |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve work and recovers the pool` | failed | passed | passed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected reserve-queue work and recovers the pool` | failed | passed | passed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected savepoint work and recovers the pool` | failed | passed | passed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction work and recovers the pool` | failed | passed | passed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-closed work and recovers the pool` | failed | passed | passed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > cjs: rejects disconnected transaction-queue work and recovers the pool` | failed | passed | passed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected reserve work and recovers the pool` | failed | passed | passed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected reserve-queue work and recovers the pool` | failed | passed | passed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected savepoint work and recovers the pool` | failed | passed | passed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction work and recovers the pool` | failed | passed | passed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction-closed work and recovers the pool` | failed | passed | passed |
| `packages/db/src/postgres-connection-recovery.test.ts > postgres connection recovery > esm: rejects disconnected transaction-queue work and recovers the pool` | failed | passed | passed |

- 3.4.9: `postgres@3.4.9`: 12 failed; Node v24.21.0; embedded-postgres@18.1.0-beta.16 (patched) in packages/db; drizzle-orm@0.45.2 in packages/db
- As published: `postgres@3.4.9 (patched)`: 12 passed; Node v24.21.0; embedded-postgres@18.1.0-beta.16 (patched) in packages/db; drizzle-orm@0.45.2 in packages/db
- Fork: `@steadybrew/postgresjs@4.6.0`: 12 passed; Node v24.21.0; embedded-postgres@18.1.0-beta.16 (patched) in packages/db; drizzle-orm@0.45.2 in packages/db

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

## Full test suite

The general and serialized test lanes of Paperclip's PR workflow, sharded as that workflow shards them, plus typecheck and build. A test that runs in more than one shard counts once.

This runs no 3.4.9 job. Its columns compare the fork with the checkout as published, which uses `postgres@3.4.9 (patched)`.

### Failing on both

- `<tmp>/server/src/__tests__/chat-channels.integration.test.ts > fails`: a test in a throwaway project that the chat suite runs to check its own sharding; it fails on purpose.
