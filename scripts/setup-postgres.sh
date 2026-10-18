#!/usr/bin/env bash
set -euo pipefail
[[ ${GITHUB_ACTIONS:-} == true ]] || { echo 'This setup is only for GitHub Actions' >&2; exit 1; }
version=17

if command -v pg_lsclusters >/dev/null; then
  while read -r cluster_version cluster_name; do
    sudo pg_dropcluster --stop "$cluster_version" "$cluster_name"
  done < <(pg_lsclusters --no-header | awk '{print $1, $2}')
fi
if ! sudo grep -Rq 'apt.postgresql.org' /etc/apt/sources.list.d /etc/apt/sources.list; then
  sudo install -d /usr/share/postgresql-common/pgdg
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc |
    sudo tee /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc >/dev/null
  printf 'deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt %s-pgdg main\n' "$(lsb_release -cs)" |
    sudo tee /etc/apt/sources.list.d/pgdg.list >/dev/null
fi
sudo apt-get update
sudo apt-get -y install "postgresql-$version" ${PG_PACKAGES:-}
config="/etc/postgresql/$version/main"
[[ -d "$config" ]] || sudo pg_createcluster "$version" main --port 5432
printf 'local all all peer\nhost all all 127.0.0.1/32 scram-sha-256\nhost all all ::1/128 scram-sha-256\n' |
  sudo tee "$config/pg_hba.conf" >/dev/null
sudo sed -i 's/.*port = .*/port = 5432/' "$config/postgresql.conf"
sudo pg_ctlcluster "$version" main restart
pg_isready -p 5432
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER USER postgres PASSWORD 'postgres'"
for database in "$@"; do
  sudo -u postgres createdb "$database"
done
