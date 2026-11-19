# HA-SlimDash — standalone Docker deployment

This deployment runs SlimDash as an independent container beside an existing Home Assistant Container installation.

## Target environment

- Synology DS223j
- DSM 7.4.1-90080 Update 1
- Container Manager 24.0.2-1707
- Home Assistant: `http://192.168.1.50:8123`, using host networking
- SlimDash host port: `8099`

## Files

- `compose.yaml` — builds the existing SlimDash application and publishes port 8099.
- `.env.example` — template for the Home Assistant URL and token.
- `.gitignore` — excludes the local token file and persistent data.
- `config/options.example.json` — example dashboard and access-network configuration.
- `data/` — created locally; stores `options.json` persistently.

The image build context is `../slimdash`. Keep the repository directory structure intact when deploying; copying only this `docker/` directory will break the build context.

## Configuration

1. Copy `.env.example` to `.env`.
2. In Home Assistant, create a dedicated user for SlimDash and generate a Long-Lived Access Token for that user.
3. Put the token in `.env` as `HA_TOKEN`. Do not commit or share this file.
4. Create the local `data` directory and copy `config/options.example.json` to `data/options.json`.
5. Edit `data/options.json` for the dashboard name, dashboard path and view indexes.

The example exposes one dashboard at `/tablet`. The `views` value is empty, so SlimDash uses the first view. Set it to comma-separated view indexes when specific views are required.

For stronger LAN isolation, replace the example `allowed_networks` range with the tablet's fixed IP address in CIDR form (for example, `192.168.1.123/32`). The application checks the client address it receives; verify this behavior from the tablet after deployment.

An optional `access_key` can also be added to `options.json`. Keep the token and access key private.

## Build and start

Run these commands from the `docker/` directory using a Docker Compose-capable terminal:

```sh
mkdir -p data
cp .env.example .env
cp config/options.example.json data/options.json
# Edit .env and data/options.json before starting.
docker compose build
docker compose up -d
docker compose logs -f slimdash
```

On Synology, create a Container Manager Project using this Compose file and preserve the repository's parent `slimdash/` directory so that the relative build context resolves. The exact DSM UI workflow should be confirmed before deployment.

## Access and checks

- Open `http://192.168.1.50:8099/tablet` from a device on the local network.
- The diagnostic page is `http://192.168.1.50:8099/diag`.
- For legacy rendering tests, append `?type=1`, `?type=2`, or `?type=3` to the dashboard URL.
- Check logs with `docker compose logs -f slimdash`.

## Security and operational notes

- Do not expose port 8099 to the public internet.
- Use a dedicated Home Assistant account and token with the minimum practical permissions.
- Keep `.env` out of Git and restrict access to the deployment directory.
- Restrict `allowed_networks` to the tablet's fixed address once known.
- No TLS is configured; use this service only on a trusted LAN or behind a separately secured proxy.
- The current application reads its options from `/data/options.json`. The token is supplied as an environment variable; Docker secrets are not supported by the current application code.
- The container runs the upstream Dockerfile as provided. Non-root hardening and a health check remain follow-up improvements.

## Current status

The Compose and example configuration files are initial packaging drafts. They have not yet been built or run on the DS223j. Verify the build, Home Assistant API connection, client-IP filtering and Android tablet rendering before treating the deployment as production-ready.

The original add-on files under `slimdash/` and the existing Home Assistant container are left unchanged by this deployment work.
