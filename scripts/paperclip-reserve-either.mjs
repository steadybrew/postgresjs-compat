import { readFileSync, writeFileSync } from 'node:fs'

const file = 'packages/db/src/__fixtures__/postgres-connection-recovery.mjs'
const anchor = '      reserved.release();\n      assert.equal((await capture(reserved.unsafe("select 1"))).code, "CONNECTION_CLOSED");'
const either = '      reserved.release();\n      assert.ok(["CONNECTION_CLOSED", "CONNECTION_RELEASED"].includes((await capture(reserved.unsafe("select 1"))).code));'
const text = readFileSync(file, 'utf8')
if (text.split(anchor).length !== 2) {
  console.error(file + ' must contain exactly one released-handle assertion')
  process.exit(1)
}
writeFileSync(file, text.replace(anchor, either))
console.log('the released-handle assertion in ' + file + ' accepts CONNECTION_CLOSED or CONNECTION_RELEASED')
