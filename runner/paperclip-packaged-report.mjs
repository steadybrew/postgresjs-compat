import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [fork, input, runUrl] = process.argv.slice(2)
if (!fork || !input) {
  console.error('usage: node runner/paperclip-packaged-report.mjs <fork version> <artifacts dir> [run url]')
  process.exit(2)
}

const load = variant => {
  const file = join(input, 'packaged-' + variant, 'result.json')
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
}
const runs = [['Published', load('published')], ['With an npm override to the fork', load('override')]]
const any = runs.find(([, r]) => r)?.[1]
const date = new Date().toISOString().slice(0, 10)
const failed = runs.filter(([, r]) => !r || Object.entries(r.steps).some(([, s]) => s.status !== 'passed'))
const describe = d => d.error ? 'not resolvable: `' + d.error + '`' : '`' + d.id + '`' + (d.patched.length ? ', with Paperclip\'s patch' : ', no patch')
const locations = [...new Set(runs.flatMap(([, r]) => (r?.entries || []).map(e => e.name + ' ' + e.location)))]
const titles = [...new Set(runs.flatMap(([, r]) => Object.keys(r?.tests || {})))]

const md = [
  '# Paperclip ' + (any?.paperclip || '') + ' installed from npm',
  '',
  'Run on ' + date + ' with Node ' + (any?.node || '') + ' and PostgreSQL 17' + (runUrl ? ' ([workflow run](' + runUrl + '))' : '') + '.',
  '',
  'Each run installs `paperclipai@' + (any?.paperclip || '') + '` with npm into an empty directory, as an npm user does, then records which `postgres` each published Paperclip package resolves and whether it carries Paperclip\'s `postgres@3.4.9.patch`. The second run adds `"overrides": { "postgres": "npm:@steadybrew/postgresjs@' + fork + '" }`, a change a user can make; it is not how Paperclip would publish the fork.',
  '',
  'The recovery tests run Paperclip\'s unchanged [child-process fixture](https://github.com/paperclipai/paperclip/blob/' + (any?.ref || '') + '/packages/db/src/__fixtures__/postgres-connection-recovery.mjs) from inside the installed `@paperclipai/db`, so it loads `postgres` as that package does. They keep the test file\'s checks: exit 0, `recovered` on stdout, nothing on stderr, within 15 s. They use PostgreSQL 17 from apt instead of embedded PostgreSQL.',
  ...(failed.length ? ['', '**Setup failed in: ' + failed.map(([label]) => label).join(', ') + '.** The results below are incomplete.'] : []),
  '',
  '| Package | Location | Declares `postgres` | ' + runs.map(([label]) => label).join(' | ') + ' |',
  '| --- | --- | --- | --- | --- |',
  ...locations.map(key => {
    const [name, location] = key.split(' ')
    const found = runs.map(([, r]) => r?.entries.find(e => e.name === name && e.location === location))
    const declares = found.find(Boolean)?.declares
    return '| `' + name + '` | `' + location + '` | ' + (declares ? '`' + declares + '`' : 'no') + ' | ' + found.map(e => e ? describe(e.driver) : '—').join(' | ') + ' |'
  }),
  '',
  '| Recovery test | ' + runs.map(([label]) => label).join(' | ') + ' |',
  '| --- | --- | --- |',
  ...titles.map(t => '| ' + t + ' | ' + runs.map(([, r]) => r?.tests[t] || '—').join(' | ') + ' |'),
  '',
  ...runs.map(([label, r]) => '- ' + label + ': ' + (r ? Object.values(r.tests).filter(s => s === 'passed').length + ' of ' + Object.keys(r.tests).length + ' passed' : 'no result'))
].join('\n') + '\n'

if (any) {
  const dir = new URL('../results/', import.meta.url)
  mkdirSync(dir, { recursive: true })
  writeFileSync(new URL('paperclip-npm-' + any.paperclip + '.md', dir), md)
  writeFileSync(new URL('paperclip-npm-' + any.paperclip + '.json', dir), JSON.stringify({ date, run: runUrl || null, fork, published: runs[0][1], override: runs[1][1] }, null, 1) + '\n')
}
process.stdout.write(md)
process.exit(failed.length ? 1 : 0)
