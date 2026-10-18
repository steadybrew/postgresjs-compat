import { execFileSync, spawnSync } from 'node:child_process'
import { appendFileSync, closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'

const [name, variant, version, migrate, outArg] = process.argv.slice(2)
if (!name || !['baseline', 'fork'].includes(variant) || !version || !migrate || !outArg) {
  console.error('usage: node runner/run.mjs <target> baseline|fork <fork version> <migrate version> <out dir>')
  process.exit(2)
}

const target = JSON.parse(readFileSync(new URL('../targets/' + name + '.json', import.meta.url), 'utf8'))
const out = resolve(outArg)
mkdirSync(out, { recursive: true })
const report = join(out, 'vitest.json')
const scratch = mkdtempSync(join(process.env.RUNNER_TEMP || tmpdir(), 'compat-'))
const repo = join(scratch, 'repo')
const cwd = join(repo, target.workdir || '.')
const env = { ...process.env, CI: 'true', ...target.env }
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

const installed = dir => {
  const file = realpathSync(join(repo, dir, 'node_modules', 'postgres', 'package.json'))
  const { name, version } = JSON.parse(readFileSync(file, 'utf8'))
  return name + '@' + version
}

git(scratch, 'init', '-q', 'repo')
git(repo, 'fetch', '-q', '--depth', '1', 'https://github.com/' + target.repo + '.git', target.ref)
git(repo, 'checkout', '-q', 'FETCH_HEAD')

const alias = 'npm:@steadybrew/postgresjs@^4'
const spec = variant === 'fork' ? 'npm:@steadybrew/postgresjs@' + version : '3.4.9'
const want = variant === 'fork' ? '@steadybrew/postgresjs@' + version : 'postgres@3.4.9'
const resolved = {}

run('switch', 'npx -y @steadybrew/postgresjs-migrate@' + migrate + ' . --switch', repo)
writeFileSync(join(out, 'switch.diff'), git(repo, 'diff'))
const changed = git(repo, 'diff', '--name-only').split('\n').filter(Boolean)
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

for (const [file, text] of Object.entries(target.append || {}))
  appendFileSync(join(repo, file), '\n' + text)

const packageManager = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8')).packageManager || ''
const ready = steps.switch.status === 'passed'
  && (!packageManager.startsWith('pnpm@') || run('pnpm', 'npm install -g ' + packageManager.split('+')[0], repo))
  && run('install', target.install)

if (ready) {
  steps.resolve = { status: 'passed' }
  for (const dir of target.resolve || ['.']) {
    try {
      resolved[dir] = installed(dir)
    } catch (error) {
      resolved[dir] = error.code || error.message
    }
    if (resolved[dir] !== want)
      fail('resolve', dir + ' resolves postgres to ' + resolved[dir] + ', not ' + want)
  }
  target.build && run('build', target.build)
  run('test', target.test.replaceAll('{report}', report))
}

const tests = {}
const add = (id, status) => {
  let key = id
  for (let n = 2; key in tests; n++)
    key = id + ' #' + n
  tests[key] = status
}
if (existsSync(report)) {
  for (const file of JSON.parse(readFileSync(report, 'utf8')).testResults) {
    const path = relative(repo, file.name)
    if (file.status === 'failed' && (file.message || !file.assertionResults.length))
      add(path + ' > (file)', 'failed')
    for (const test of file.assertionResults)
      add([path, ...test.ancestorTitles, test.title].join(' > '), test.status)
  }
}

writeFileSync(join(out, 'result.json'), JSON.stringify({
  target: name,
  repo: target.repo,
  tag: target.tag,
  ref: target.ref,
  variant,
  version: variant === 'fork' ? version : '3.4.9',
  migrate,
  resolved,
  steps,
  tests
}, null, 1) + '\n')
console.log(Object.keys(tests).length, 'tests recorded')
