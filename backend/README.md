# LogPulse Go API

The Go service is the application's only API server. It owns authentication, user-scoped connections and settings, SQLite persistence, local log reads, SSH/SFTP access, downloads, and live streams. The React build is served separately as static files by Nginx; Caddy routes `/api/*` and `/health` to Go.

## Requirements

- Go 1.27 or later
- SQLite database file writable by the service account
- OpenSSH `ssh` and `sftp` clients for remote connections
- Set `APP_USERNAME` and `APP_PASSWORD` before the first launch. There are no built-in credentials. Existing Node-created accounts and password hashes are retained.

## Run locally

```sh
cd logs/backend
export DATA_DIR=./data
export LOG_ALLOWED_ROOTS=/var/log,/tmp
make run
```

`make run` loads `../../.env` when the required credentials are not already in the environment. If that file is absent, set `APP_USERNAME` and `APP_PASSWORD` in your shell first. The API listens on port 8080 by default. Start the React development server separately with `cd logs && npm run dev`; Vite proxies API calls to Go. `DATA_DIR` defaults to `./data`. `LOG_ALLOWED_ROOTS` is a comma-separated allowlist for local-folder connections.

## Authentication and data

Sign-in creates a random server-side session and sets an HttpOnly, SameSite cookie. All API routes except health and login require that session. The SQLite database is stored at `$DATA_DIR/logpulse.sqlite`; connection secrets are not returned by list or update responses. Existing connections are assigned to the first active user during migration, and active connections/settings are isolated per user.

For SSH, the service uses OpenSSH with first-use host-key recording (`accept-new`) in `$DATA_DIR/known_hosts`. Mount approved local log directories into the Go container and include them in `LOG_ALLOWED_ROOTS`.

## Production deployment

The repository-level `docker-compose.yml` uses the root `.env` file for Go credentials and log access. Caddy serves `*.cloudeskaerp.test` with the certificate pair mounted read-only from `certs/`; keep the private key out of version control. LogPulse is available at `logs.cloudeskaerp.test` and DBX at `dbx.cloudeskaerp.test`; point both local DNS/hosts entries to this server. `logpulse-data` persists the SQLite database. Set `LOG_ALLOWED_ROOTS` to the log directories mounted into the Go container.

```sh
docker compose up --build -d
```

The frontend container contains only the static build. The Go container owns the shared database volume. Do not run multiple Go replicas against the same SQLite file; move persistence to a server database before horizontal scaling.
