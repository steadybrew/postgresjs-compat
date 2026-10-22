#!/usr/bin/env bash
set -euo pipefail
[[ ${GITHUB_ACTIONS:-} == true ]] || { echo 'This registry is only for GitHub Actions' >&2; exit 1; }
dir="$RUNNER_TEMP/registry"
mkdir -p "$dir"
cat > "$dir/config.yaml" <<EOF
storage: $dir/storage
auth:
  htpasswd:
    file: $dir/htpasswd
    max_users: 1
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
packages:
  'paperclipai':
    access: \$all
    publish: \$authenticated
  '@paperclipai/*':
    access: \$all
    publish: \$authenticated
  '**':
    access: \$all
    publish: \$authenticated
    proxy: npmjs
max_body_size: 2gb
log: { type: stdout, format: pretty, level: warn }
EOF
npx -y verdaccio@6.10.5 --config "$dir/config.yaml" --listen 4873 > "$dir/verdaccio.log" 2>&1 &
for _ in $(seq 60); do
  curl -fs http://localhost:4873/-/ping >/dev/null && break
  sleep 1
done
token=$(curl -fs -X PUT http://localhost:4873/-/user/org.couchdb.user:compat \
  -H 'content-type: application/json' \
  -d '{"name":"compat","password":"compat-local-only"}' | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0, "utf8")).token)')
echo "::add-mask::$token"
echo "//localhost:4873/:_authToken=$token" >> "$HOME/.npmrc"
