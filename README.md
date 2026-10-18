# postgresjs-compat

Runs other libraries' own test suites against [`@steadybrew/postgresjs`](https://github.com/steadybrew/postgresjs), to check that libraries which load `postgres` by name work unchanged after switching with the npm alias.

## How a run works

For each library in [`targets/`](targets):

1. Clone it at a pinned commit and run [`@steadybrew/postgresjs-migrate --switch`](https://github.com/steadybrew/postgresjs/tree/main/codemod), which sets `"postgres": "npm:@steadybrew/postgresjs@^4"`.
2. Run its tests twice on that checkout: once with the alias replaced by `postgres` 3.4.9, once with the fork version under test.
3. Compare. A **regression** is a test or step that passes with 3.4.9 and fails with the fork. Tests that fail with both are listed but not counted, and so are tests the fork fixes.

PostgreSQL 17 is installed from apt on the runner, one cluster for both runs.

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
| `resolve` | Directories whose `node_modules/postgres` must be the version under test (default: the root) |
| `timeoutMinutes` | Limit for each command |
