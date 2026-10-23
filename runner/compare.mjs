import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [version, migrate, input, runUrl] = process.argv.slice(2)
if (!version || !migrate || !input) {
  console.error('usage: node runner/compare.mjs <fork version> <migrate version> <artifacts dir> [run url]')
  process.exit(2)
}

const targetsDir = new URL('../targets/', import.meta.url)
const resultsDir = new URL('../results/', import.meta.url)
const artifacts = readdirSync(input).map(d => d.match(/^result-(.+)-(unchanged|baseline|fork)(?:-(\d+))?$/)).filter(Boolean)
const names = [...new Set(artifacts.map(m => m[1]))].sort()
const load = (name, variant, shards) => {
  const runs = artifacts
    .filter(m => m[1] === name && m[2] === variant && existsSync(join(input, m[0], 'result.json')))
    .map(m => JSON.parse(readFileSync(join(input, m[0], 'result.json'), 'utf8')))
  if (runs.length !== (shards || 1))
    return null
  if (!shards)
    return runs[0]
  const counts = {}
  for (const run of runs)
    for (const [status, n] of Object.entries(run.counts || {}))
      counts[status] = (counts[status] || 0) + n
  return {
    ...runs[0],
    shard: null,
    command: null,
    shards: runs.map(r => ({ shard: r.shard, command: r.command, steps: r.steps })),
    steps: Object.fromEntries(runs.flatMap(r => Object.entries(r.steps).map(([step, s]) => [step + ' #' + r.shard, s]))),
    counts,
    tests: Object.assign({}, ...runs.map(r => r.tests))
  }
}
const passed = s => s === 'passed'
const failed = s => s === 'failed' || s === undefined
const status = (run, id) => id.startsWith('step: ') ? run?.steps[id.slice(6)]?.status : run?.tests[id]
const setupFailures = (run, label) => Object.entries(run?.steps || {}).filter(([step, s]) => !/^test( #\d+)?$/.test(step) && !passed(s.status)).map(([step]) => step + ' with ' + label)

const summary = names.map(name => {
  const target = JSON.parse(readFileSync(new URL(name + '.json', targetsDir), 'utf8'))
  const variants = target.variants || [target.unchanged && 'unchanged', 'baseline', 'fork'].filter(Boolean)
  const shards = target.shards?.length
  const unchanged = variants.includes('unchanged') ? load(name, 'unchanged', shards) : null
  const baseline = variants.includes('baseline') ? load(name, 'baseline', shards) : null
  const fork = load(name, 'fork', shards)
  const regressions = []
  const fixed = []
  const bothFailing = []
  let bothPassing = 0
  const missing = variants.filter(v => !{ unchanged, baseline, fork }[v])
  if (missing.length)
    regressions.push('(no complete result from the ' + missing.join(' and ') + ' run)')
  const runs = [unchanged, baseline, fork]
  const reference = variants.includes('baseline') ? baseline : unchanged
  const ids = missing.length ? [] : [...new Set(runs.flatMap(r => [...Object.keys(r?.steps || {}).map(step => 'step: ' + step), ...Object.keys(r?.tests || {})]))]
  for (const id of ids) {
    const [before, base, after] = [unchanged, reference, fork].map(r => status(r, id))
    if (passed(base) && passed(after))
      id.startsWith('step: ') || bothPassing++
    else if ((passed(base) || passed(before)) && failed(after))
      regressions.push(id)
    else if (base === 'failed' && passed(after))
      fixed.push(id)
    else if (base === 'failed' && after === 'failed')
      bothFailing.push(id)
  }
  const harness = [...setupFailures(unchanged, target.unchanged + ' as published'), ...setupFailures(baseline, 'postgres@3.4.9')]
  return { name, target, unchanged, baseline, fork, bothPassing, regressions, fixed, bothFailing, harness }
})

const date = new Date().toISOString().slice(0, 10)
const link = s => '[' + s.name + '](' + (s.target.fixture ? '../fixtures/' + s.target.fixture : 'https://github.com/' + s.target.repo + '/tree/' + s.target.ref) + ')'
const list = (title, rows) => rows.length ? ['', '### ' + title, '', ...rows.map(r => '- `' + r + '`')] : []
const describe = run => {
  if (!run)
    return 'no result'
  const counts = Object.entries(run.counts || {}).map(([s, n]) => n + ' ' + s).join(', ') || 'no tests'
  const versions = Object.entries(run.versions || {}).flatMap(([dir, pkgs]) => Object.values(pkgs).map(v => v + ' in ' + dir))
  return [counts, 'Node ' + run.node, ...versions].join('; ')
}
const threeWay = s => {
  const runs = [['3.4.9: `postgres@3.4.9`', s.baseline], ['As published: `' + s.target.unchanged + '`', s.unchanged], ['Fork: `@steadybrew/postgresjs@' + version + '`', s.fork]]
  const ids = [...new Set(runs.flatMap(([, r]) => Object.keys(r?.tests || {})))].sort()
  return [
    '',
    '### All three runs',
    '',
    '| Test | ' + runs.map(([label]) => label).join(' | ') + ' |',
    '| --- | --- | --- | --- |',
    ...ids.map(id => '| `' + id + '` | ' + runs.map(([, r]) => r?.tests[id] || '—').join(' | ') + ' |'),
    '',
    ...runs.map(([label, r]) => '- ' + label + ': ' + describe(r))
  ]
}
const uses = variant => summary.filter(s => (s.target.variants || [s.target.unchanged && 'unchanged', 'baseline', 'fork'].filter(Boolean)).includes(variant)).map(s => s.name).join(', ') || 'none'
const md = [
  '# @steadybrew/postgresjs ' + version,
  '',
  'Run on ' + date + ' with `@steadybrew/postgresjs-migrate` ' + migrate + ' and PostgreSQL 17, except where a library starts its own' + (runUrl ? ' ([workflow run](' + runUrl + '))' : '') + '.',
  '',
  'Each library\'s own tests run on its pinned checkout, in separate jobs with fresh installs:',
  '',
  '- **3.4.9**: `@steadybrew/postgresjs-migrate --switch`, then the dependency set to `postgres` 3.4.9. The switch also removes any `postgres` patch the fork already contains, so this is plain 3.4.9. Libraries: ' + uses('baseline') + '.',
  '- **Fork**: the same switch, with `@steadybrew/postgresjs` ' + version + '. Libraries: ' + uses('fork') + '.',
  '- **As published**: the checkout without the switch, for libraries that ship their own patched `postgres`. Libraries: ' + uses('unchanged') + '.',
  '',
  'A regression is a test or step that passes with 3.4.9 or as published, and fails with the fork. "Passing on both", "Fixed by the fork" and "Failing on both" compare the fork with 3.4.9, or with the published checkout for a library that has no 3.4.9 run.',
  '',
  '| Library | Version | Passing on both | Regressions | Fixed by the fork | Failing on both |',
  '| --- | --- | --- | --- | --- | --- |',
  ...summary.map(s => '| ' + link(s) + ' | ' + s.target.tag + ' | ' + s.bothPassing + ' | ' + s.regressions.length + ' | ' + s.fixed.length + ' | ' + s.bothFailing.length + ' |'),
  ...summary.flatMap(s => s.target.table || s.harness.length || s.regressions.length || s.fixed.length || s.bothFailing.length
    ? ['', '## ' + s.name, ...(s.harness.length ? ['', '**Setup failed: ' + s.harness.join(', ') + '.** The results for this library are not usable.'] : []), ...(s.target.table ? threeWay(s) : []), ...(s.target.variants && !s.target.variants.includes('baseline') ? ['', 'This library runs no 3.4.9 job. Its columns compare the fork with the checkout as published, which uses `' + s.target.unchanged + '`.'] : []), ...list('Regressions', s.regressions), ...list('Fixed by the fork', s.fixed), ...list('Failing on both', s.bothFailing)]
    : [])
].join('\n') + '\n'

if (process.env.PARTIAL !== 'true') {
  mkdirSync(resultsDir, { recursive: true })
  writeFileSync(new URL(version + '.md', resultsDir), md)
  writeFileSync(new URL(version + '.json', resultsDir), JSON.stringify({
    version,
    migrate,
    date,
    run: runUrl || null,
    targets: Object.fromEntries(summary.map(s => [s.name, {
      repo: s.target.repo || null,
      fixture: s.target.fixture || null,
      tag: s.target.tag,
      ref: s.target.ref,
      regressions: s.regressions,
      fixed: s.fixed,
      bothFailing: s.bothFailing,
      ...(s.target.unchanged ? { unchanged: s.unchanged } : {}),
      baseline: s.baseline,
      fork: s.fork
    }]))
  }, null, 1) + '\n')
}

process.stdout.write(md)
process.exit(summary.some(s => s.regressions.length || s.harness.length) || !summary.length ? 1 : 0)
