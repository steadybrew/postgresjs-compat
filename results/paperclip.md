# Paperclip on @steadybrew/postgresjs 4.6.0

Paperclip ships `postgres@3.4.9` with its own recovery patch, `patches/postgres@3.4.9.patch`, from [PR 13643](https://github.com/paperclipai/paperclip/pull/13643). This page collects the evidence for replacing the patched driver with `@steadybrew/postgresjs` 4.6.0, installed under the `postgres` name. Everything below ran on GitHub Actions against Paperclip [v2026.1012.0](https://github.com/paperclipai/paperclip/tree/bba6a45f0d364cfd962ac59b3bdf2426a8222adb).

- **Recovery tests.** Paperclip's 12 connection recovery tests, unchanged, fail on plain 3.4.9 and pass on Paperclip's patched 3.4.9 and on the fork without the patch. [Results](4.6.0.md#paperclip).
- **npm installs.** `npm install paperclipai@2026.1012.0` resolves plain `postgres@3.4.9` without the patch, and the recovery fixture fails 12 of 12 from that install. Rebuilt through Paperclip's release steps with the fork as its dependency, all three packages resolve the fork and pass 12 of 12. [Results](paperclip-npm-2026.1012.0.md).
- **Paperclip's own tests.** The general and serialized lanes of Paperclip's PR workflow, sharded as that workflow shards them, plus typecheck and build, on the patched driver and on the fork. All 30,645 distinct tests have the same status on both: 29,850 pass, 794 are skipped, and one fails on both, a test named `fails` in a throwaway project that the chat suite runs to check its own sharding. Typecheck and build pass on both. [Results](4.6.0.md#paperclip-app), from [this run](https://github.com/steadybrew/postgresjs-compat/actions/runs/39859807245).

## The change

```diff
 packages/db/package.json
-    "postgres": "^3.4.9"
+    "postgres": "npm:@steadybrew/postgresjs@4.6.0"
 package.json, pnpm-workspace.yaml
-  postgres@3.4.9: patches/postgres@3.4.9.patch
 patches/postgres@3.4.9.patch
 (deleted)
```

Imports stay as they are. `npx @steadybrew/postgresjs-migrate . --switch` makes these changes and recognises every change in the patch as a fork fix; the version is then pinned exactly. `doc/DATABASE.md` needs its patch paragraph rewritten. The lockfile is left to Paperclip's CI.

## Behaviour that differs for Paperclip

A query on a reserved connection after `release()`, or on a transaction handle after its transaction ends, rejects with `CONNECTION_ENDED`. Paperclip's patch uses its own `CONNECTION_RELEASED`, which no Paperclip code checks. `server/src/database-retry.ts` treats `CONNECTION_ENDED` as transient for operations that callers mark as idempotent, so such a misuse inside one of them would be retried twice, about 150 ms in all, before failing with the same error.

The other 4.x changes in the [upgrade guide](https://github.com/steadybrew/postgresjs/blob/main/docs/upgrading.md#upgrading-to-400) do not reach Paperclip's code:

- `COPY` keeps its connection: backups run `COPY ... TO STDOUT` on a dedicated single-connection client and read it to the end before closing it.
- Callbacks that throw surface as uncaught exceptions: Paperclip passes only a no-op `onnotice`.
- `PGSSL=disable` means no TLS, `fetch_types: false` decodes arrays, named `sql.prepare` and `target_session_attrs` changed: none is used.
- Node 22 or newer: Paperclip requires 24.11.
- Tracing: Sentry runs errors-only, and OpenTelemetry's auto-instrumentation covers `pg`, not postgres.js, so no span changes.

## Limits

- The tests ran on the v2026.1012.0 release. On master as of 2026-10-22 the patch, the recovery tests and the driver dependency are unchanged since that release, but the test suite was not run on master.
- The npm checks run Paperclip's fixture against PostgreSQL 17 from apt; Paperclip's own suite uses its embedded PostgreSQL 18.
- Paperclip's end-to-end, browser and runner lanes were not run.
- In an earlier run, `server/src/__tests__/heartbeat-process-recovery.test.ts` failed once on the patched driver: its cleanup deleted `agent_wakeup_requests` rows that a background heartbeat run still referenced. It passed on the patched driver in the other runs and on the fork in all of them, so it is a flaky test, not a difference between the drivers.
- Paperclip's test wrapper takes no reporter arguments, so the runner adds a JSON reporter to its vitest call before installing. No test is changed.
- Only `@steadybrew/postgresjs` 4.6.0 was tested, pinned exactly.

## Reverting

Set `packages/db/package.json` back to `"postgres": "^3.4.9"`, restore `patches/postgres@3.4.9.patch` and its `patchedDependencies` entries in `package.json` and `pnpm-workspace.yaml`, and reinstall.
