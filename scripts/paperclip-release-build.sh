#!/usr/bin/env bash
set -euo pipefail
[[ ${GITHUB_ACTIONS:-} == true ]] || { echo 'This build is only for GitHub Actions' >&2; exit 1; }
[[ $# == 2 ]] || { echo 'usage: scripts/paperclip-release-build.sh <paperclip checkout> <version to publish>' >&2; exit 2; }
[[ ${npm_config_registry:-} == http://localhost:* ]] || { echo 'npm_config_registry must point at the local registry' >&2; exit 1; }

REPO_ROOT="$(cd "$1" && pwd)"
CLI_DIR="$REPO_ROOT/cli"
version="$2"
. "$REPO_ROOT/scripts/release-lib.sh"
export PAPERCLIP_RELEASE_REUSE_UI_DIST=1

cd "$REPO_ROOT"
pnpm build
node "$REPO_ROOT/scripts/build-standalone-public-packages.mjs"
bash "$REPO_ROOT/scripts/prepare-server-ui-dist.sh"
for pkg_dir in server packages/adapters/claude-local packages/adapters/codex-local; do
  rm -rf "$REPO_ROOT/$pkg_dir/skills"
  cp -r "$REPO_ROOT/skills" "$REPO_ROOT/$pkg_dir/skills"
done

set_public_package_version "$version"
"$REPO_ROOT/scripts/build-npm.sh" --skip-checks --skip-typecheck

while IFS=$'\t' read -r pkg_dir pkg_name pkg_version; do
  [ -z "$pkg_dir" ] && continue
  echo "Publishing $pkg_name@$pkg_version"
  cd "$REPO_ROOT/$pkg_dir"
  publish_tool="$(package_publish_tool)"
  if [ "$publish_tool" = "npm" ]; then
    publish_dir="$(mktemp -d "${RUNNER_TEMP}/paperclip-release-package.XXXXXX")"
    node "$REPO_ROOT/scripts/prepare-bundled-package.mjs" "$REPO_ROOT/$pkg_dir" "$publish_dir"
    cd "$publish_dir"
  fi
  run_package_publish "$publish_tool" compat true
done <<< "$(list_public_package_info)"
