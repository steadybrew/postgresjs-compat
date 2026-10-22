import { execFileSync, spawnSync } from 'node:child_process'
import { appendFileSync, closeSync, cpSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [name, variant, version, migrate, outArg, shardArg] = process.argv.slice(2)
if (!name || !['unchanged', 'baseline', 'fork'].includes(variant) || !version || !migrate || !outArg) {
  console.error('usage: node runner/run.mjs <target> unchanged|baseline|fork <fork version> <migrate version> <out dir> [shard]')
  process.exit(2)
}

const target = JSON.parse(readFileSync(new URL('../targets/' + name + '.json', import.meta.url), 'utf8'))
if (variant === 'unchanged' && !target.unchanged) {
  console.error(name + ' has no unchanged run')
  process.exit(2)
}
const shard = target.shards ? Number(shardArg) : null
if (target.shards && !(shard >= 0 && shard < target.shards.length)) {
  console.error(name + ' needs a shard from 0 to ' + (target.shards.length - 1))
  process.exit(2)
}
const out = resolve(outArg)
mkdirSync(out, { recursive: true })
const report = join(out, 'vitest.json')
const scratch = mkdtempSync(join(process.env.RUNNER_TEMP || tmpdir(), 'compat-'))
const repo = join(scratch, 'repo')
const cwd = join(repo, target.workdir || '.')
const env = { ...process.env, CI: 'true', COMPAT_ROOT: fileURLToPath(new URL('..', import.meta.url)), COMPAT_REPORTS: out, ...target.env }
const steps = {}

const git = (dir, ...args) => execFileSync('git', ['-c', 'core.symlinks=false', '-c', 'core.hooksPath=/dev/null', ...args], {
  cwd: dir,
  encoding: 'utf8',
  maxBuffer: 1 << 28,
  env: { ...process.env, GIT_LFS_SKIP_SMUDGE: '1', GIT_TERMINAL_PROMPT: '0' }
})

const run = (step, command, dir = cwd) => {
  const log = join(out, step + '.log')
  const fd = openSync(log, 'w')
  const started = Date.now()
  const result = spawnSync(command, { cwd: dir, env, shell: true, stdio: ['ignore', fd, fd], timeout: (target.timeoutMinutes || 15) * 60_000 })
  closeSync(fd)
  steps[step] = { status: result.status === 0 ? 'passed' : 'failed', exit: result.status, seconds: Math.round((Date.now() - started) / 1000) }
  console.log(step, steps[step].status, steps[step].seconds + 's')
  if (result.status !== 0)
    console.log(readFileSync(log, 'utf8').split('\n').slice(-60).join('\n'))
  return result.status === 0
}

const fail = (step, reason) => {
  steps[step] = { ...steps[step], status: 'failed', reason }
  console.log(step, 'failed:', reason)
}

const installed = (dir, pkg) => {
  const file = realpathSync(join(repo, dir, 'node_modules', pkg, 'package.json'))
  const { name, version } = JSON.parse(readFileSync(file, 'utf8'))
  return name + '@' + version + (file.includes('_patch_hash=') ? ' (patched)' : '')
}

git(scratch, 'init', '-q', 'repo')
if (target.fixture) {
  cpSync(new URL('../fixtures/' + target.fixture, import.meta.url), repo, { recursive: true })
  git(repo, 'add', '-A')
  git(repo, '-c', 'user.name=compat', '-c', 'user.email=compat@localhost', 'commit', '-q', '-m', 'fixture')
} else {
  git(repo, 'fetch', '-q', '--depth', '1', 'https://github.com/' + target.repo + '.git', target.ref)
  git(repo, 'checkout', '-q', 'FETCH_HEAD')
}
if (target.prepare) {
  run('prepare', target.prepare, repo)
  git(repo, 'add', '-A')
  git(repo, '-c', 'user.name=compat', '-c', 'user.email=compat@localhost', 'commit', '-q', '--allow-empty', '-m', 'prepare')
  writeFileSync(join(out, 'prepare.diff'), git(repo, 'show', 'HEAD'))
}

const alias = 'npm:@steadybrew/postgresjs@^4'
const spec = variant === 'fork' ? 'npm:@steadybrew/postgresjs@' + version : '3.4.9'
const want = { unchanged: target.unchanged, baseline: 'postgres@3.4.9', fork: '@steadybrew/postgresjs@' + version }[variant]
const resolved = {}
const versions = {}

const packageManager = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8')).packageManager || ''
let ready = steps.prepare?.status !== 'failed' && (!packageManager.startsWith('pnpm@') || run('pnpm', 'npm install -g ' + packageManager.split('+')[0], repo))
if (ready && target.buildBeforeSwitch)
  ready = run('original-install', target.install) && run('build', target.build)

if (ready && variant !== 'unchanged') {
  run('switch', 'npx -y @steadybrew/postgresjs-migrate@' + migrate + ' . --switch', repo)
  writeFileSync(join(out, 'switch.diff'), git(repo, 'diff'))
  const changed = git(repo, 'diff', '--name-only', '--diff-filter=d').split('\n').filter(Boolean)
  let replaced = 0
  for (const file of changed) {
    const path = join(repo, file)
    const text = readFileSync(path, 'utf8')
    if (!text.includes(alias))
      continue
    writeFileSync(path, text.replaceAll(alias, spec))
    replaced++
  }
  if (steps.switch.status === 'passed' && !changed.length)
    fail('switch', 'the switch changed no files')
  else if (steps.switch.status === 'passed' && !replaced)
    fail('switch', 'no file contains ' + alias)
  ready = steps.switch.status === 'passed'
}

if (ready) {
  for (const [file, text] of Object.entries(target.append || {}))
    appendFileSync(join(repo, file), '\n' + text)
  ready = run('install', target.install)
}

if (ready) {
  steps.resolve = { status: 'passed' }
  for (const dir of target.resolve || ['.']) {
    try {
      resolved[dir] = installed(dir, 'postgres')
    } catch (error) {
      resolved[dir] = error.code || error.message
    }
    if (resolved[dir] !== want)
      fail('resolve', dir + ' resolves postgres to ' + resolved[dir] + ', not ' + want)
    for (const pkg of target.versions || []) {
      try {
        versions[dir] = { ...versions[dir], [pkg]: installed(dir, pkg) }
      } catch (error) {
        versions[dir] = { ...versions[dir], [pkg]: error.code || error.message }
      }
    }
  }
  target.build && !target.buildBeforeSwitch && run('build', target.build)
  run('test', target.shards ? target.shards[shard] : target.test.replaceAll('{report}', report))
}

const tests = {}
const stable = id => id
  .replace(/^(?:\.\.\/)+(?:private\/)?tmp\/(?:.*\/)?[^/]*-[A-Za-z0-9]{6}\//, '<tmp>/')
  .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
  .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g, '<time>')
  .replace(/\bPID \d+/g, 'PID <n>')
const add = (id, status) => {
  const base = stable(id)
  let key = base
  for (let n = 2; key in tests; n++)
    key = base + ' #' + n
  tests[key] = status
}
for (const json of readdirSync(out).filter(f => /^vitest(-.+)?\.json$/.test(f)).sort()) {
  for (const file of JSON.parse(readFileSync(join(out, json), 'utf8')).testResults) {
    const path = relative(repo, file.name)
    if (file.status === 'failed' && (file.message || !file.assertionResults.length))
      add(path + ' > (file)', 'failed')
    for (const test of file.assertionResults)
      add([path, ...test.ancestorTitles, test.title].join(' > '), test.status)
  }
}

const counts = {}
for (const [id, status] of Object.entries(tests))
  id.endsWith(' > (file)') || (counts[status] = (counts[status] || 0) + 1)
if (target.tests && steps.test) {
  const ran = (counts.passed || 0) + (counts.failed || 0)
  steps.count = { status: 'passed' }
  ran === target.tests || fail('count', ran + ' of ' + target.tests + ' tests ran')
}

writeFileSync(join(out, 'result.json'), JSON.stringify({
  target: name,
  repo: target.repo || null,
  fixture: target.fixture || null,
  tag: target.tag,
  ref: target.ref,
  variant,
  shard,
  command: target.shards ? target.shards[shard] : target.test,
  version: want,
  migrate,
  node: process.version,
  resolved,
  versions,
  steps,
  counts,
  tests
}, null, 1) + '\n')
console.log(Object.keys(tests).length, 'tests recorded')
