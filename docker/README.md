# Standalone Docker deployment

This directory is reserved for the independent Docker deployment of HA-SlimDash.

The existing Home Assistant add-on files under `slimdash/` remain the source of truth and will not be modified as part of the initial packaging work.

Planned contents:

- `compose.yaml` — standalone service definition
- `.env.example` — documented environment variable names (no secrets)
- `config/options.example.json` — example SlimDash options
- `README.md` — build, configuration, startup, update, and troubleshooting instructions

The deployment will use a separate container and host port, connect to the existing Home Assistant instance through its HTTP/WebSocket API, and persist its configuration in a dedicated data directory.

Files will be added after the target NAS and Container Manager environment are confirmed.
