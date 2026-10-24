import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const closed = 'reserved.release();\n      assert.equal((await capture(reserved.unsafe("select 1"))).code, "CONNECTION_CLOSED");'
const released = 'reserved.release();\n      assert.equal((await capture(reserved.unsafe("select 1"))).code, "CONNECTION_RELEASED");'

export const reserveReleased = text => {
  if (text.split(closed).length !== 2)
    throw new Error('the recovery fixture must contain exactly one released-handle assertion')
  return text.replace(closed, released)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = 'packages/db/src/__fixtures__/postgres-connection-recovery.mjs'
  if (process.env.COMPAT_VARIANT !== 'fork') {
    console.log(file + ' is unchanged on the ' + process.env.COMPAT_VARIANT + ' run')
    process.exit(0)
  }
  writeFileSync(file, reserveReleased(readFileSync(file, 'utf8')))
  console.log('the released-handle assertion in ' + file + ' expects CONNECTION_RELEASED')
}
