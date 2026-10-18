import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [version, migrate, input, runUrl] = process.argv.slice(2)
if (!version || !migrate || !input) {
  console.error('usage: node runner/compare.mjs <fork version> <migrate version> <artifacts dir> [run url]')
  process.exit(2)
}

const targetsDir = new URL('../targets/', import.meta.url)
const resultsDir = new URL('../results/', import.meta.url)
const names = [...new Set(readdirSync(input).map(d => d.match(/^result-(.+)-(?:baseline|fork)$/)?.[1]).filter(Boolean))].sort()
const load = (name, variant) => {
  const file = join(input, 'result-' + name + '-' + variant, 'result.json')
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
}
const passed = s => s === 'passed'
const failed = s => s === 'failed' || s === undefined

const summary = names.map(name => {
  const target = JSON.parse(readFileSync(new URL(name + '.json', targetsDir), 'utf8'))
  const baseline = load(name, 'baseline')
  const fork = load(name, 'fork')
  const regressions = []
  const fixed = []
  const bothFailing = []
  let bothPassing = 0
  if (!baseline || !fork)
    regressions.push('(no result from the ' + [!baseline && 'baseline', !fork && 'fork'].filter(Boolean).join(' and ') + ' run)')
  const pairs = [
    ...Object.keys({ ...baseline?.steps, ...fork?.steps }).map(step => ['step: ' + step, baseline?.steps[step]?.status, fork?.steps[step]?.status]),
    ...Object.keys({ ...baseline?.tests, ...fork?.tests }).map(id => [id, baseline?.tests[id], fork?.tests[id]])
  ]
  for (const [id, before, after] of baseline && fork ? pairs : []) {
    if (passed(before) && passed(after))
      id.startsWith('step: ') || bothPassing++
    else if (passed(before) && failed(after))
      regressions.push(id)
    else if (before === 'failed' && passed(after))
      fixed.push(id)
    else if (before === 'failed' && after === 'failed')
      bothFailing.push(id)
  }
  return { name, target, baseline, fork, bothPassing, regressions, fixed, bothFailing }
})

const date = new Date().toISOString().slice(0, 10)
const link = s => '[' + s.name + '](' + (s.target.fixture ? '../fixtures/' + s.target.fixture : 'https://github.com/' + s.target.repo + '/tree/' + s.target.ref) + ')'
const list = (title, rows) => rows.length ? ['', '### ' + title, '', ...rows.map(r => '- `' + r + '`')] : []
const md = [
  '# @steadybrew/postgresjs ' + version,
  '',
  'Run on ' + date + ' with `@steadybrew/postgresjs-migrate` ' + migrate + ' and PostgreSQL 17' + (runUrl ? ' ([workflow run](' + runUrl + '))' : '') + '.',
  '',
  'Each library\'s own tests run twice on the same checkout after `--switch`: once with `postgres` 3.4.9 and once with `@steadybrew/postgresjs` ' + version + '. A regression is a test or step that passes with 3.4.9 and fails with the fork.',
  '',
  '| Library | Version | Passing on both | Regressions | Fixed by the fork | Failing on both |',
  '| --- | --- | --- | --- | --- | --- |',
  ...summary.map(s => '| ' + link(s) + ' | ' + s.target.tag + ' | ' + s.bothPassing + ' | ' + s.regressions.length + ' | ' + s.fixed.length + ' | ' + s.bothFailing.length + ' |'),
  ...summary.flatMap(s => s.regressions.length || s.fixed.length || s.bothFailing.length
    ? ['', '## ' + s.name, ...list('Regressions', s.regressions), ...list('Fixed by the fork', s.fixed), ...list('Failing on both', s.bothFailing)]
    : [])
].join('\n') + '\n'

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
    baseline: s.baseline,
    fork: s.fork
  }]))
}, null, 1) + '\n')

process.stdout.write(md)
process.exit(summary.some(s => s.regressions.length) || !summary.length ? 1 : 0)
