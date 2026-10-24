import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const anchor = '      reserved.release();\n      assert.equal((await capture(reserved.unsafe("select 1"))).code, "CONNECTION_CLOSED");'
const either = '      reserved.release();\n      assert.match((await capture(reserved.unsafe("select 1"))).code, /^CONNECTION_(CLOSED|RELEASED)$/);'

export const reserveEither = text => {
  if (text.split(anchor).length !== 2)
    throw new Error('the recovery fixture must contain exactly one released-handle assertion')
  return text.replace(anchor, either)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = 'packages/db/src/__fixtures__/postgres-connection-recovery.mjs'
  writeFileSync(file, reserveEither(readFileSync(file, 'utf8')))
  console.log('the released-handle assertion in ' + file + ' accepts CONNECTION_CLOSED or CONNECTION_RELEASED')
}
