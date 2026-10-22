# Paperclip 2026.1012.0 installed from npm

Run on 2026-10-22 with Node v24.22.1 and PostgreSQL 17 ([workflow run](https://github.com/steadybrew/postgresjs-compat/actions/runs/39806479240)).

Each run installs `paperclipai@2026.1012.0` with npm into an empty directory, as an npm user does, then records which `postgres` each published Paperclip package resolves and whether it carries Paperclip's `postgres@3.4.9.patch`. The second run adds `"overrides": { "postgres": "npm:@steadybrew/postgresjs@4.6.0" }`, a change a user can make; it is not how Paperclip would publish the fork.

The recovery tests run Paperclip's unchanged [child-process fixture](https://github.com/paperclipai/paperclip/blob/bba6a45f0d364cfd962ac59b3bdf2426a8222adb/packages/db/src/__fixtures__/postgres-connection-recovery.mjs) from inside the installed `@paperclipai/db`, so it loads `postgres` as that package does. They keep the test file's checks: exit 0, `recovered` on stdout, nothing on stderr, within 15 s. They use PostgreSQL 17 from apt instead of embedded PostgreSQL.

| Package | Location | Declares `postgres` | Published | With an npm override to the fork |
| --- | --- | --- | --- | --- |
| `paperclipai` | `node_modules/paperclipai` | `^3.4.9` | `postgres@3.4.9`, no patch | `@steadybrew/postgresjs@4.6.0`, no patch |
| `@paperclipai/server` | `node_modules/@paperclipai/server` | no | `postgres@3.4.9`, no patch | `@steadybrew/postgresjs@4.6.0`, no patch |
| `@paperclipai/db` | `node_modules/@paperclipai/db` | `^3.4.9` | `postgres@3.4.9`, no patch | `@steadybrew/postgresjs@4.6.0`, no patch |

| Recovery test | Published | With an npm override to the fork |
| --- | --- | --- |
| esm: rejects disconnected transaction work and recovers the pool | failed | passed |
| esm: rejects disconnected transaction-closed work and recovers the pool | failed | passed |
| esm: rejects disconnected savepoint work and recovers the pool | failed | passed |
| esm: rejects disconnected reserve work and recovers the pool | failed | passed |
| esm: rejects disconnected transaction-queue work and recovers the pool | failed | passed |
| esm: rejects disconnected reserve-queue work and recovers the pool | failed | passed |
| cjs: rejects disconnected transaction work and recovers the pool | failed | passed |
| cjs: rejects disconnected transaction-closed work and recovers the pool | failed | passed |
| cjs: rejects disconnected savepoint work and recovers the pool | failed | passed |
| cjs: rejects disconnected reserve work and recovers the pool | failed | passed |
| cjs: rejects disconnected transaction-queue work and recovers the pool | failed | passed |
| cjs: rejects disconnected reserve-queue work and recovers the pool | failed | passed |

- Published: 0 of 12 passed
- With an npm override to the fork: 12 of 12 passed
