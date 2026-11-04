import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [version, migrate, input, runUrl] = process.argv.slice(2)
if (!version || !migrate || !input) {
  console.error('usage: node runner/compare.mjs <fork version> <migrate version> <artifacts dir> [run url]')
  process.exit(2)
}
const { UPSTREAM, UPSTREAM_SHA } = process.env

const candidates = [
  { variant: 'fork', short: 'fork', label: 'the fork', spec: '`@steadybrew/postgresjs@' + version + '`' },
  UPSTREAM && { variant: 'upstream', short: 'upstream ' + UPSTREAM, label: 'upstream `postgres` ' + UPSTREAM, spec: '`postgres@' + UPSTREAM + '`' },
  UPSTREAM_SHA && { variant: 'upstream-git', short: 'upstream ' + UPSTREAM_SHA.slice(0, 7), label: 'upstream porsager/postgres ' + UPSTREAM_SHA.slice(0, 7), spec: '[porsager/postgres@' + UPSTREAM_SHA.slice(0, 7) + '](https://github.com/porsager/postgres/tree/' + UPSTREAM_SHA + ')' }
].filter(Boolean)
const order = ['baseline', 'unchanged', ...candidates.map(c => c.variant)]
const short = { baseline: '3.4.9', unchanged: 'as published', ...Object.fromEntries(candidates.map(c => [c.variant, c.short])) }

const targetsDir = new URL('../targets/', import.meta.url)
const resultsDir = new URL('../results/', import.meta.url)
const artifacts = readdirSync(input).map(d => d.match(/^result-(.+)-(unchanged|baseline|fork|upstream|upstream-git)(?:-(\d+))?$/)).filter(Boolean)
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
    tests: Object.assign({}, ...runs.map(r => r.tests)),
    errors: Object.assign({}, ...runs.map(r => r.errors || {}))
  }
}
const passed = s => s === 'passed'
const failed = s => s === 'failed' || s === undefined
const status = (run, id) => id.startsWith('step: ') ? run?.steps[id.slice(6)]?.status : run?.tests[id]
const error = (run, id) => id.startsWith('step: ') ? run?.steps[id.slice(6)]?.reason || run?.steps[id.slice(6)]?.error : run?.errors?.[id]
const setupFailures = (run, label) => Object.entries(run?.steps || {}).filter(([step, s]) => !/^test( #\d+)?$/.test(step) && !passed(s.status)).map(([step]) => step + ' with ' + label)

const diff = (unchanged, reference, after, missing) => {
  const regressions = []
  const fixed = []
  const bothFailing = []
  const errors = {}
  let bothPassing = 0
  if (missing.length)
    regressions.push('(no complete result from the ' + missing.join(' and ') + ' run)')
  const ids = missing.length ? [] : [...new Set([unchanged, reference, after].flatMap(r => [...Object.keys(r?.steps || {}).map(step => 'step: ' + step), ...Object.keys(r?.tests || {})]))]
  for (const id of ids) {
    const [before, base, now] = [unchanged, reference, after].map(r => status(r, id))
    if (passed(base) && passed(now))
      id.startsWith('step: ') || bothPassing++
    else if ((passed(base) || passed(before)) && failed(now)) {
      regressions.push(id)
      const message = error(after, id)
      if (message)
        errors[id] = message
    } else if (id.startsWith('step: '))
      continue
    else if (base === 'failed' && passed(now))
      fixed.push(id)
    else if (base === 'failed' && now === 'failed')
      bothFailing.push(id)
  }
  return { bothPassing, regressions, fixed, bothFailing, errors }
}

const summary = names.map(name => {
  const target = JSON.parse(readFileSync(new URL(name + '.json', targetsDir), 'utf8'))
  const variants = target.variants || [target.unchanged && 'unchanged', 'baseline', 'fork'].filter(Boolean)
  const shards = target.shards?.length
  const runs = {
    unchanged: variants.includes('unchanged') ? load(name, 'unchanged', shards) : null,
    baseline: variants.includes('baseline') ? load(name, 'baseline', shards) : null,
    ...Object.fromEntries(candidates.map(c => [c.variant, load(name, c.variant, shards)]))
  }
  const reference = variants.includes('baseline') ? runs.baseline : runs.unchanged
  const own = variants.filter(v => v === 'unchanged' || v === 'baseline').filter(v => !runs[v])
  const results = Object.fromEntries(candidates.map(c => [c.variant, diff(runs.unchanged, reference, runs[c.variant], [...own, ...(runs[c.variant] ? [] : [c.variant])])]))
  const harness = [...setupFailures(runs.unchanged, target.unchanged + ' as published'), ...setupFailures(runs.baseline, 'postgres@3.4.9')]
  const ran = [...variants.filter(v => v === 'unchanged' || v === 'baseline'), ...candidates.map(c => c.variant)].sort((a, b) => order.indexOf(a) - order.indexOf(b))
  return { name, target, runs, results, harness, ran }
})

const date = new Date().toISOString().slice(0, 10)
const link = (s, group) => '[' + (group && s.target.title || s.name) + '](' + (s.target.fixture ? '../fixtures/' + s.target.fixture : 'https://github.com/' + s.target.repo + '/tree/' + s.target.ref) + ')'
const list = (title, rows, notes = {}) => rows.length ? ['', '### ' + title, '', ...rows.map(r => '- `' + r + '`' + (notes[r] ? ': ' + notes[r] : ''))] : []
const quote = text => '`' + text.replaceAll('`', "'") + '`'
const describe = run => {
  if (!run)
    return 'no result'
  const counts = Object.entries(run.counts || {}).map(([s, n]) => n + ' ' + s).join(', ') || 'no tests'
  const versions = Object.entries(run.versions || {}).flatMap(([dir, pkgs]) => Object.values(pkgs).map(v => v + ' in ' + dir))
  return [counts, 'Node ' + run.node, ...versions].join('; ')
}
const labels = s => ({
  baseline: '3.4.9: `postgres@3.4.9`',
  unchanged: 'As published: `' + s.target.unchanged + '`',
  ...Object.fromEntries(candidates.map(c => [c.variant, c.short[0].toUpperCase() + c.short.slice(1) + ': ' + c.spec]))
})
const allRuns = s => {
  const runs = s.ran.map(v => [labels(s)[v], s.runs[v]])
  const ids = [...new Set(runs.flatMap(([, r]) => Object.keys(r?.tests || {})))].sort()
  return [
    '',
    '### All runs',
    '',
    '| Test | ' + runs.map(([label]) => label).join(' | ') + ' |',
    '| --- |' + runs.map(() => ' --- |').join(''),
    ...ids.map(id => '| `' + id + '` | ' + runs.map(([, r]) => r?.tests[id] || '—').join(' | ') + ' |'),
    '',
    ...runs.map(([label, r]) => '- ' + label + ': ' + describe(r))
  ]
}
const table = (rows, group, c) => [
  '| ' + (group ? 'Tests' : 'Library') + ' | Version | Runs | Passing on both | Regressions | Fixed by ' + c.label + ' | Failing on both |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map(s => {
    const r = s.results[c.variant]
    return '| ' + link(s, group) + ' | ' + s.target.tag + ' | ' + s.ran.filter(v => !candidates.some(o => o.variant === v) || v === c.variant).map(v => short[v]).join(', ') + ' | ' + r.bothPassing + ' | ' + r.regressions.length + ' | ' + r.fixed.length + ' | ' + r.bothFailing.length + ' |'
  })
]
const details = (s, c) => {
  const r = s.results[c.variant]
  const notes = { ...Object.fromEntries(Object.entries(r.errors).map(([id, e]) => [id, quote(e)])), ...s.target.notes }
  const suffix = c.variant === 'fork' ? '' : ' with ' + c.label
  return [
    ...list('Regressions' + suffix, r.regressions, notes),
    ...list('Fixed by ' + c.label, r.fixed, s.target.notes),
    ...list('Failing on both' + suffix, r.bothFailing, s.target.notes)
  ]
}
const render = (rows, group) => [
  '# ' + (group ? group + ' on ' : '') + '@steadybrew/postgresjs ' + version,
  '',
  'Run on ' + date + ' with `@steadybrew/postgresjs-migrate` ' + migrate + ' and ' + (rows.every(s => !s.target.databases?.length) ? 'the PostgreSQL that ' + (group || 'each library') + '\'s tests start themselves' : 'PostgreSQL 17, except where a library starts its own') + (runUrl ? ' ([workflow run](' + runUrl + '))' : '') + '.',
  '',
  (group ? group + '\'s' : 'Each library\'s') + ' tests run in up to ' + (2 + candidates.length) + ' ways, each in its own job with a fresh install:',
  '',
  '- **3.4.9**: plain `postgres` 3.4.9. The switch tool removes ' + (group ? group + '\'s `postgres` patch' : 'any `postgres` patch the library carries') + ', so this run has none.',
  '- **As published**: ' + (group || 'the library') + ' exactly as published, with its own patched `postgres`.' + (group ? '' : ' Only for libraries that ship one.'),
  '- **Fork**: `@steadybrew/postgresjs` ' + version + ', with ' + (group ? group + '\'s' : 'any `postgres`') + ' patch removed.',
  ...candidates.filter(c => c.variant !== 'fork').map(c => '- **' + c.short[0].toUpperCase() + c.short.slice(1) + '**: ' + c.spec + ' in place of the fork, with the same switch and patch removal.'),
  '',
  'A regression is a test that passes with 3.4.9 or as published, and fails with the ' + (candidates.length > 1 ? 'fork or upstream run it is counted for' : 'fork') + '. The other counts compare that run with 3.4.9, or with the published ' + (group || 'library') + ' when there is no 3.4.9 run.',
  '',
  ...candidates.flatMap((c, i) => [...(candidates.length > 1 ? ['## ' + c.short[0].toUpperCase() + c.short.slice(1) + ': ' + c.spec, ''] : []), ...table(rows, group, c), ...(i < candidates.length - 1 ? [''] : [])]),
  ...rows.flatMap(s => {
    const body = candidates.flatMap(c => details(s, c))
    return s.target.table || s.harness.length || body.length
      ? ['', '## ' + (group && s.target.title || s.name), ...(group && s.target.description ? ['', s.target.description] : []), ...(s.harness.length ? ['', '**Setup failed: ' + s.harness.join(', ') + '.** The results for this library are not usable.'] : []), ...(s.target.table ? allRuns(s) : []), ...(s.target.variants && !s.target.variants.includes('baseline') ? ['', 'This runs no 3.4.9 job. Its columns compare each run with the checkout as published, which uses `' + s.target.unchanged + '`.'] : []), ...body]
      : []
  })
].join('\n') + '\n'
const md = render(summary)
const groups = [...new Set(summary.map(s => s.target.group).filter(Boolean))]

if (process.env.PARTIAL !== 'true') {
  mkdirSync(resultsDir, { recursive: true })
  writeFileSync(new URL(version + '.md', resultsDir), md)
  for (const group of groups)
    writeFileSync(new URL(group.toLowerCase() + '-' + version + '.md', resultsDir), render(summary.filter(s => s.target.group === group), group))
  writeFileSync(new URL(version + '.json', resultsDir), JSON.stringify({
    version,
    migrate,
    upstream: UPSTREAM || null,
    upstreamSha: UPSTREAM_SHA || null,
    date,
    run: runUrl || null,
    targets: Object.fromEntries(summary.map(s => [s.name, {
      repo: s.target.repo || null,
      fixture: s.target.fixture || null,
      tag: s.target.tag,
      ref: s.target.ref,
      ...s.results.fork,
      ...Object.fromEntries(candidates.filter(c => c.variant !== 'fork').map(c => [c.variant + 'Results', s.results[c.variant]])),
      ...(s.target.unchanged ? { unchanged: s.runs.unchanged } : {}),
      baseline: s.runs.baseline,
      ...Object.fromEntries(candidates.map(c => [c.variant, s.runs[c.variant]]))
    }]))
  }, null, 1) + '\n')
}

process.stdout.write(process.env.GROUP ? render(summary.filter(s => s.target.group === process.env.GROUP), process.env.GROUP) : md)
process.exit(summary.some(s => s.results.fork.regressions.length || s.harness.length) || !summary.length ? 1 : 0)
