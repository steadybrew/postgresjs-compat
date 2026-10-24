# Paperclip on @steadybrew/postgresjs 4.7.0

Paperclip ships `postgres@3.4.9` with its own recovery patch, `patches/postgres@3.4.9.patch`, from [PR 13643](https://github.com/paperclipai/paperclip/pull/13643). This page collects the evidence for replacing the patched driver with `@steadybrew/postgresjs` 4.7.0, installed under the `postgres` name. Everything below ran on GitHub Actions against Paperclip [v2026.1012.0](https://github.com/paperclipai/paperclip/tree/bba6a45f0d364cfd962ac59b3bdf2426a8222adb).

- **Tests.** Paperclip's 12 recovery tests fail on plain 3.4.9 and pass on Paperclip's patched 3.4.9 and on the fork. Paperclip's full test suite, typecheck and build give the same results on the patched 3.4.9 and on the fork. [Results](paperclip-4.7.0.md).
- **npm users get the fix.** Today the patch only reaches source and Docker installs: `npm install paperclipai` gets plain 3.4.9 and fails all 12 recovery tests. With the fork as the dependency, the npm install passes all 12. [Results](paperclip-npm-2026.1012.0.md).

## The change

Three lines, a deleted patch file and one line in a test; no application code changes.

```diff
 packages/db/package.json
-    "postgres": "^3.4.9"
+    "postgres": "npm:@steadybrew/postgresjs@4.7.0"

 package.json, pnpm-workspace.yaml
-  postgres@3.4.9: patches/postgres@3.4.9.patch

 patches/postgres@3.4.9.patch
 (deleted)

 packages/db/src/__fixtures__/postgres-connection-recovery.mjs
-      assert.equal((await capture(reserved.unsafe("select 1"))).code, "CONNECTION_CLOSED");
+      assert.equal((await capture(reserved.unsafe("select 1"))).code, "CONNECTION_RELEASED");
```

Imports stay as they are, and the lockfile is left to Paperclip's CI. The full change, with the rewritten patch paragraph in `doc/DATABASE.md`, is [paperclip-4.7.0.diff](paperclip-4.7.0.diff). It applies with `git apply` to v2026.1012.0 and to master as of 2026-10-23.

We checked each 4.x behaviour change in the [upgrade guide](https://github.com/steadybrew/postgresjs/blob/main/docs/upgrading.md#upgrading-to-4x) against Paperclip's code, and found one minor difference. When a reserved connection is used after `release()` and the connection had already closed, the fork rejects with `CONNECTION_RELEASED` instead of `CONNECTION_CLOSED`. Using a handle after `release()` is a bug in the calling code, so the fork reports that rather than a lost connection, which callers may retry. Paperclip's patch already uses `CONNECTION_RELEASED` when the connection is still open. Only the test above reaches this case.

You can run the same check with the [switching tool](https://github.com/steadybrew/postgresjs/tree/main/codemod), also on the [Codemod](https://codemod.com) registry. It changes nothing; it lists what to change, what to review and what is worth knowing, with file and line. On Paperclip it lists the test line above under review:

```sh
npx @steadybrew/postgresjs-migrate .
```

With `--switch` it makes the dependency change above: it points `postgres` at the fork and removes the patch with both registrations, since it recognises every change in the patch as a fork fix. Then pin the version exactly.

## Limits

- The tests ran on the v2026.1012.0 release and on `@steadybrew/postgresjs` 4.7.0.
- Paperclip's end-to-end, browser and runner lanes were not run.
- In an earlier run, `server/src/__tests__/heartbeat-process-recovery.test.ts` failed once on the patched driver: its cleanup deleted `agent_wakeup_requests` rows that a background heartbeat run still referenced. It passed on the patched driver in the other runs and on the fork in all of them, so it is a flaky test, not a difference between the drivers.
- Paperclip's test wrapper takes no reporter arguments, so the runner adds a JSON reporter to its vitest call before installing. The fork runs change the one test line shown above; no other test is changed.

## Reverting

Set `packages/db/package.json` back to `"postgres": "^3.4.9"`, restore `patches/postgres@3.4.9.patch` and its `patchedDependencies` entries in `package.json` and `pnpm-workspace.yaml`, set the recovery fixture's check back to `CONNECTION_CLOSED`, and reinstall.
