# Paperclip 2026.1012.0 installed from npm

Run on 2026-10-24 with Node v24.21.0 and PostgreSQL 17 ([workflow run](https://github.com/steadybrew/postgresjs-compat/actions/runs/40087393979)).

Each run installs `paperclipai` with npm into an empty directory, as an npm user does, then records which `postgres` each Paperclip package resolves and whether it carries Paperclip's `postgres@3.4.9.patch`. The published runs install `paperclipai@2026.1012.0` from npm; the second adds `"overrides": { "postgres": "npm:@steadybrew/postgresjs@4.7.0" }`, a change a user can make, not how Paperclip would publish the fork.

The two rebuilt runs build Paperclip 2026.1012.0 from source with the build and publish steps of its `scripts/release.sh`, publish every public package to a registry that exists only inside the job, and install `paperclipai` from it the same way. One builds the release unchanged, to show the rebuild matches what npm serves. The other first runs `@steadybrew/postgresjs-migrate --switch`, pins `npm:@steadybrew/postgresjs@4.7.0` and leaves out Paperclip's patch, the change Paperclip would make.

The recovery tests run Paperclip's unchanged [child-process fixture](https://github.com/paperclipai/paperclip/blob/bba6a45f0d364cfd962ac59b3bdf2426a8222adb/packages/db/src/__fixtures__/postgres-connection-recovery.mjs) from inside the installed `@paperclipai/db`, so it loads `postgres` as that package does. They keep the test file's checks: exit 0, `recovered` on stdout, nothing on stderr, within 15 s. They use PostgreSQL 17 from apt instead of embedded PostgreSQL.

| Package | Location | Published | Published, with an npm override to the fork | Rebuilt unchanged | Rebuilt with the fork as its dependency |
| --- | --- | --- | --- | --- | --- |
| `paperclipai` | `node_modules/paperclipai` | declares `^3.4.9`; resolves `postgres@3.4.9`, no patch | declares `^3.4.9`; resolves `@steadybrew/postgresjs@4.7.0`, no patch | declares `^3.4.9`; resolves `postgres@3.4.9`, no patch | declares `npm:@steadybrew/postgresjs@4.7.0`; resolves `@steadybrew/postgresjs@4.7.0`, no patch |
| `@paperclipai/server` | `node_modules/@paperclipai/server` | declares no `postgres`; resolves `postgres@3.4.9`, no patch | declares no `postgres`; resolves `@steadybrew/postgresjs@4.7.0`, no patch | declares no `postgres`; resolves `postgres@3.4.9`, no patch | declares no `postgres`; resolves `@steadybrew/postgresjs@4.7.0`, no patch |
| `@paperclipai/db` | `node_modules/@paperclipai/db` | declares `^3.4.9`; resolves `postgres@3.4.9`, no patch | declares `^3.4.9`; resolves `@steadybrew/postgresjs@4.7.0`, no patch | declares `^3.4.9`; resolves `postgres@3.4.9`, no patch | declares `npm:@steadybrew/postgresjs@4.7.0`; resolves `@steadybrew/postgresjs@4.7.0`, no patch |

| Recovery test | Published | Published, with an npm override to the fork | Rebuilt unchanged | Rebuilt with the fork as its dependency |
| --- | --- | --- | --- | --- |
| esm: rejects disconnected transaction work and recovers the pool | failed | passed | failed | passed |
| esm: rejects disconnected transaction-closed work and recovers the pool | failed | passed | failed | passed |
| esm: rejects disconnected savepoint work and recovers the pool | failed | passed | failed | passed |
| esm: rejects disconnected reserve work and recovers the pool | failed | failed | failed | failed |
| esm: rejects disconnected transaction-queue work and recovers the pool | failed | passed | failed | passed |
| esm: rejects disconnected reserve-queue work and recovers the pool | failed | passed | failed | passed |
| cjs: rejects disconnected transaction work and recovers the pool | failed | passed | failed | passed |
| cjs: rejects disconnected transaction-closed work and recovers the pool | failed | passed | failed | passed |
| cjs: rejects disconnected savepoint work and recovers the pool | failed | passed | failed | passed |
| cjs: rejects disconnected reserve work and recovers the pool | failed | failed | failed | failed |
| cjs: rejects disconnected transaction-queue work and recovers the pool | failed | passed | failed | passed |
| cjs: rejects disconnected reserve-queue work and recovers the pool | failed | passed | failed | passed |

- Published: 0 of 12 passed
- Published, with an npm override to the fork: 10 of 12 passed
- Rebuilt unchanged: 0 of 12 passed
- Rebuilt with the fork as its dependency: 10 of 12 passed
