# postgresjs-compat

Runs other libraries' and applications' own test suites against [`@steadybrew/postgresjs`](https://github.com/steadybrew/postgresjs), to check that code which loads `postgres` by name works unchanged after switching with the npm alias.

## How a run works

For each library in [`targets/`](targets):

1. Clone it at a pinned commit and run [`@steadybrew/postgresjs-migrate --switch`](https://github.com/steadybrew/postgresjs/tree/main/codemod), which sets `"postgres": "npm:@steadybrew/postgresjs@^4"`.
2. Run its tests twice on that checkout: once with the alias replaced by `postgres` 3.4.9, once with the fork version under test.
3. If the target ships its own patched `postgres`, such as Paperclip, also run its tests on the checkout as published, without the switch.
4. Compare. A **regression** is a test or step that passes with 3.4.9, or on the unchanged checkout, and fails with the fork. Tests that fail with both 3.4.9 and the fork are listed but not counted, and so are tests the fork fixes. Targets with an unchanged run also get a table of every test in all three runs.

Test names are recorded with UUIDs, timestamps, process IDs and random temporary directories replaced by placeholders, so a test whose name carries such a value matches across runs. Each run is its own job with a fresh checkout and install. A `postgres` that pnpm patched resolves as `postgres@3.4.9 (patched)`, so the 3.4.9 and fork runs also check that no patch is left.

If a setup step fails with 3.4.9 or on the unchanged checkout, the harness is broken for that library and the run fails.

PostgreSQL 17 is installed from apt on the runner, one cluster per run, for targets that list `databases`. Paperclip starts its own embedded PostgreSQL.

## Results

One file per fork version in [`results/`](results), written by the workflow.

## Running it

Start the **compat** workflow from the Actions tab. Leave `version` empty to test npm `latest`, and `targets` empty to run every library.

## Adding a library

Add `targets/<name>.json`:

| Field | Meaning |
| --- | --- |
| `repo`, `tag`, `ref` | GitHub repository, the release it tests and that release's full commit SHA |
| `node` | Node.js version |
| `databases` | Databases to create, owned by `postgres` with password `postgres` |
| `workdir` | Directory the commands run in, if not the repository root |
| `env` | Extra environment variables |
| `append` | Text to append to files after the switch, such as pnpm settings |
| `install`, `build`, `test` | Commands; `{report}` in `test` is the path for vitest's JSON report |
| `buildBeforeSwitch` | Install and build with the library's own lockfile before switching, as its published build is made |
| `resolve` | Directories whose `node_modules/postgres` must be the version under test (default: the root) |
| `unchanged` | Also run the checkout as published; `postgres` must resolve to this, such as `postgres@3.4.9 (patched)` |
| `tests` | Number of tests that must run rather than skip, checked as the `count` step |
| `versions` | Other packages whose resolved versions each run records from the `resolve` directories |
| `variants` | Runs to make, from `unchanged`, `baseline` and `fork` (default: `baseline` and `fork`, plus `unchanged` when set) |
| `shards` | Test commands run as separate jobs instead of `test`, such as the shards of the target's own CI |
| `prepare` | Command run on the checkout before the switch, for harness changes only; its diff is kept as `prepare.diff` |
| `table` | Show every test of every run in the results |

[`paperclip-app`](targets/paperclip-app.json) runs the general and serialized test lanes of Paperclip's PR workflow, sharded as that workflow shards them, plus typecheck and build. It compares Paperclip's patched 3.4.9 with the fork. Its `prepare` step only adds a JSON reporter to Paperclip's test wrapper.
| `timeoutMinutes` | Limit for each command |

## Paperclip installed from npm

The **paperclip-packaged** workflow installs the published `paperclipai` release pinned in [`targets/paperclip.json`](targets/paperclip.json) with npm into an empty directory, the way an npm user gets it. It records which `postgres` each published Paperclip package resolves and whether it carries Paperclip's patch, then runs Paperclip's recovery fixture from inside the installed `@paperclipai/db`. A second run adds an npm override to the fork. Two more runs build that Paperclip release from source with the build and publish steps of its `scripts/release.sh`, publish every public package to a [Verdaccio](https://verdaccio.org) registry that exists only inside the job, and install `paperclipai` from it the same way: once unchanged, to show the rebuild matches npm, and once switched to the fork with Paperclip's patch removed. Results go to `results/paperclip-npm-<version>.md`.
