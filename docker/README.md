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

The example `allowed_networks` value is `192.168.0.0/16`, which permits clients in the full `192.168.x.x` range, including the NAS address `192.168.1.50`. This is intentionally broader than a typical single-subnet `192.168.1.0/24` rule. If your LAN also uses other private address ranges (for example `10.x.x.x`), add those explicitly. The application checks the client address it receives; verify this behavior from the tablet after deployment.

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
- The example allows the `192.168.0.0/16` private range. Adjust it if your internal network uses additional address ranges.
- No TLS is configured; use this service only on a trusted LAN or behind a separately secured proxy.
- The current application reads its options from `/data/options.json`. The token is supplied as an environment variable; Docker secrets are not supported by the current application code.
- The container runs the upstream Dockerfile as provided. Non-root hardening and a health check remain follow-up improvements.

## HTTPS reverse proxy and screen wake lock

The browser code includes optional Screen Wake Lock support. On a compatible browser, the
first touch or click requests a screen wake lock. SlimDash releases it when the page is hidden
and tries to reacquire it when the page becomes visible. The browser must support
`navigator.wakeLock`; the API also requires a secure context in browsers that enforce this
requirement. Use HTTPS for the tablet URL. If the browser does not support Wake Lock, use its
kiosk or system display settings as a fallback.

For Synology DSM, a typical reverse-proxy rule is:

| Setting | Value |
|---|---|
| Rule name | `SlimDash` |
| Source protocol | HTTPS |
| Source hostname | Your Synology DDNS hostname |
| Source port | `443` |
| Destination protocol | HTTP |
| Destination hostname | NAS LAN IP (for example, `192.168.1.50`) |
| Destination port | `8099` |
| HSTS | Leave disabled during initial testing |
| WebSocket | Enable if using features that require it, such as live-camera relay |

Assign the valid certificate for the DDNS hostname in **Control Panel → Security → Certificate
→ Settings/Configure**. DSM may show the hostname as the service to configure rather than the
custom reverse-proxy rule name.

The dashboard then uses `https://YOUR_DDNS_HOSTNAME/tablet`. A Synology DDNS name can track a
changing public IPv4 address. Do not forward port `8099` directly from the router to the
Internet. If access is LAN-only, arrange local DNS or router NAT loopback so the DDNS hostname
resolves/reaches the NAS from inside the network.

If SlimDash returns a forbidden response behind the proxy, inspect the SlimDash log to identify
the client address it receives before editing `allowed_networks`. The proxy may cause the
application to see the proxy or Docker gateway address instead of the tablet's address.

### Certificate warning

For Firefox `SEC_ERROR_UNKNOWN_ISSUER`, inspect the certificate presented to the browser.
If the issuer is `Bitdefender Untrusted CA`, HTTPS inspection may be substituting a local
certificate for the NAS certificate. Compare the result from another network before changing
certificate settings or trusting an exception.

## Current status

The Compose and example configuration files are initial packaging drafts. They have not yet been built or run on the DS223j. Verify the build, Home Assistant API connection, client-IP filtering and Android tablet rendering before treating the deployment as production-ready.

The original add-on files under `slimdash/` and the existing Home Assistant container are left unchanged by this deployment work.
