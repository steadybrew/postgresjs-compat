import { readFileSync, writeFileSync } from 'node:fs'

const file = 'scripts/run-vitest-stable.mjs'
const anchor = '["exec", "vitest", "run", ...sourceOnlyVitestArgs, ...args]'
const text = readFileSync(file, 'utf8')
if (text.split(anchor).length !== 2) {
  console.error(file + ' must contain exactly one ' + anchor)
  process.exit(1)
}
const report = '["exec", "vitest", "run", ...sourceOnlyVitestArgs, ...args, "--reporter=default", "--reporter=json", `--outputFile.json=${process.env.COMPAT_REPORTS}/vitest-${process.pid}-${Date.now()}.json`]'
writeFileSync(file, text.replace(anchor, report))
console.log('vitest runs in ' + file + ' also write JSON reports to ' + process.env.COMPAT_REPORTS)
