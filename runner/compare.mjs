import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [version, migrate, input, runUrl] = process.argv.slice(2)
if (!version || !migrate || !input) {
  console.error('usage: node runner/compare.mjs <fork version> <migrate version> <artifacts dir> [run url]')
  process.exit(2)
}

const targetsDir = new URL('../targets/', import.meta.url)
const resultsDir = new URL('../results/', import.meta.url)
const names = [...new Set(readdirSync(input).map(d => d.match(/^result-(.+)-(?:unchanged|baseline|fork)$/)?.[1]).filter(Boolean))].sort()
const load = (name, variant) => {
  const file = join(input, 'result-' + name + '-' + variant, 'result.json')
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
}
const passed = s => s === 'passed'
const failed = s => s === 'failed' || s === undefined
const status = (run, id) => id.startsWith('step: ') ? run?.steps[id.slice(6)]?.status : run?.tests[id]
const setupFailures = (run, label) => Object.entries(run?.steps || {}).filter(([step, s]) => step !== 'test' && !passed(s.status)).map(([step]) => step + ' with ' + label)

const summary = names.map(name => {
  const target = JSON.parse(readFileSync(new URL(name + '.json', targetsDir), 'utf8'))
  const unchanged = target.unchanged ? load(name, 'unchanged') : null
  const baseline = load(name, 'baseline')
  const fork = load(name, 'fork')
  const regressions = []
  const fixed = []
  const bothFailing = []
  let bothPassing = 0
  const missing = [target.unchanged && !unchanged && 'unchanged', !baseline && 'baseline', !fork && 'fork'].filter(Boolean)
  if (missing.length)
    regressions.push('(no result from the ' + missing.join(' and ') + ' run)')
  const runs = [unchanged, baseline, fork]
  const ids = missing.length ? [] : [...new Set(runs.flatMap(r => [...Object.keys(r?.steps || {}).map(step => 'step: ' + step), ...Object.keys(r?.tests || {})]))]
  for (const id of ids) {
    const [before, base, after] = runs.map(r => status(r, id))
    if (passed(base) && passed(after))
      id.startsWith('step: ') || bothPassing++
    else if ((passed(base) || passed(before)) && failed(after))
      regressions.push(id)
    else if (base === 'failed' && passed(after))
      fixed.push(id)
    else if (base === 'failed' && after === 'failed')
      bothFailing.push(id)
  }
  const harness = [...setupFailures(unchanged, target.unchanged + ' on the unchanged checkout'), ...setupFailures(baseline, 'postgres@3.4.9')]
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
  const runs = [['`postgres@3.4.9`', s.baseline], ['`' + s.target.unchanged + '`, unchanged', s.unchanged], ['`@steadybrew/postgresjs@' + version + '`', s.fork]]
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
const md = [
  '# @steadybrew/postgresjs ' + version,
  '',
  'Run on ' + date + ' with `@steadybrew/postgresjs-migrate` ' + migrate + ' and PostgreSQL 17, except where a library starts its own' + (runUrl ? ' ([workflow run](' + runUrl + '))' : '') + '.',
  '',
  'Each library\'s own tests run twice on the same checkout after `--switch`: once with `postgres` 3.4.9 and once with `@steadybrew/postgresjs` ' + version + '. A library that ships its own patched `postgres` also runs once on its unchanged checkout. A regression is a test or step that passes with 3.4.9, or on the unchanged checkout, and fails with the fork.',
  '',
  '| Library | Version | Passing on both | Regressions | Fixed by the fork | Failing on both |',
  '| --- | --- | --- | --- | --- | --- |',
  ...summary.map(s => '| ' + link(s) + ' | ' + s.target.tag + ' | ' + s.bothPassing + ' | ' + s.regressions.length + ' | ' + s.fixed.length + ' | ' + s.bothFailing.length + ' |'),
  ...summary.flatMap(s => s.target.unchanged || s.harness.length || s.regressions.length || s.fixed.length || s.bothFailing.length
    ? ['', '## ' + s.name, ...(s.harness.length ? ['', '**Setup failed: ' + s.harness.join(', ') + '.** The results for this library are not usable.'] : []), ...(s.target.unchanged ? threeWay(s) : []), ...list('Regressions', s.regressions), ...list('Fixed by the fork', s.fixed), ...list('Failing on both', s.bothFailing)]
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
