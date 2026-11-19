# HA-SlimDash 0.8.69

![SlimDash](docs/banner.jpg)

Home Assistant app (add-on) that shows your Home Assistant dashboards as live, ultra-light HTML
pages for old tablets, phones and e-readers: Android 4.4 stock browser, old Chrome, iOS 7–12
Safari, Kindle…

Publish the dashboards you already use, or build one made for each device (only the cards it
needs, larger buttons, a light theme for an e-reader), each under its own address.

![SlimDash on four old devices](docs/devices-1.jpg)

*SlimDash on four old devices: an iPad Air (iOS 11, Safari), a Kindle 4 (non-touch), a Samsung Galaxy Tab 3 and a Redmi 9A (Android 11, Chromite browser).*

![SlimDash on four old devices, other dashboards](docs/devices-2.jpg)

*The same devices with other dashboards.*

![SlimDash on a Redmi 9A](docs/redmi.jpg)

*A Home Assistant dashboard shown by SlimDash on a Redmi 9A phone (Android 11, Chromite browser), in landscape.*

![SlimDash on a Kindle 4](docs/kindle.png)

*A view shown on a Kindle 4 (non-touch e-reader).*

![SlimDash on a Galaxy Tab 3](docs/galaxy-tab.jpg)

*SlimDash on a Samsung Galaxy Tab 3 tablet (Android 4.4 stock browser).*

User documentation (options, pages, cameras, supported cards): [slimdash/DOCS.md](slimdash/DOCS.md).
Store description: [slimdash/README.md](slimdash/README.md).

## How it works

- **One WebSocket connection** to Home Assistant (through the Supervisor, no long-lived token),
  subscribed **only to the entities of the published dashboards** (`subscribe_entities`).
- The HTML is rendered on the server when the dashboard changes, then cached, once per
  rendering type actually requested.
- The browser gets changes by *long polling* (XMLHttpRequest, ES5 JavaScript): a few dozen
  bytes per change, no request to Home Assistant.
- Taps call `POST /a` → the Home Assistant service; the display changes immediately
  (optimistic update).
- Automatic reconnection to Home Assistant (restart, outage); the page reloads by itself when
  the dashboard changes.
- Cameras: images from Home Assistant, or straight from Frigate when its integration is
  installed (images at the detection rate, live video relayed for recent browsers).
- Access limited by subnets, with an optional access key.

## Rendering types

SlimDash keeps the original layout (positions, sizes, row heights) and adapts the technique
to the device, in three types chosen from the browser: type 1 (oldest devices: floats and
inline blocks), type 2 (flexbox) and type 3 (CSS grid). The cards supported, the limits of
each type and the deliberate limitations are described (in French) in
[docs/rendus.md](docs/rendus.md).

Custom cards (Mushroom, Bubble Card, button-card…) are rendered from their main options only
(entity, name, icon, color, layout, tap action). Advanced styling and scripted options are
ignored on purpose: the goal is to stay simple and light on old devices.

### Standalone Docker deployment (fork)

This development branch also contains an independent Docker deployment for an existing
Home Assistant Container installation. It runs SlimDash in its own container and does not
require Home Assistant OS or the Supervisor add-on store. It leaves the existing Home Assistant
container and configuration untouched.

- Compose file: [docker/compose.yaml](docker/compose.yaml)
- Deployment instructions, environment variables and security notes:
  [docker/README.md](docker/README.md)
- Copy `docker/.env.example` to `docker/.env`, set `HA_URL` and a Home Assistant
  Long-Lived Access Token, and create `docker/data/options.json` from
  `docker/config/options.example.json`.
- The default published port is `8099`; for example,
  `http://NAS_LAN_IP:8099/tablet`.

Keep the repository directory structure intact: the Compose build context points to
`../slimdash`. Never commit the local `.env` file or expose port 8099 directly to the
public Internet.

## Installation (beta)

SlimDash is not in the official app store yet. During the beta, add it as a **custom repository**.
It needs Home Assistant OS or Supervised (apps are not available with the Container and Core
installation types).

[![Add the SlimDash repository to my Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2FmyB0B%2FHA-SlimDash)

The button opens your Home Assistant with the address already filled in. Or by hand:

1. **Settings → Apps → Install app** (the app store), menu ⋮ (top right) → **Repositories**.
2. Paste `https://github.com/myB0B/HA-SlimDash`, then **Add** and **Close**.
3. Refresh the page, open **SlimDash** (in the new repository section) and **Install**. The first
   installation builds the image on your device: allow a few minutes and an Internet connection.
   Then **Start**.
4. Configure the published dashboards in the **Configuration** tab (see
   [slimdash/DOCS.md](slimdash/DOCS.md)).
5. On the device: `http://HA_IP:8099/<name>` (e.g. `http://192.168.1.10:8099/kitchen`).

To update: **Settings → Apps → App store**, menu ⋮ → **Check for updates**, then open SlimDash and
**Update**. This is a beta: please report problems and ideas in the
[GitHub issues](https://github.com/myB0B/HA-SlimDash/issues).

### Local app (development)

1. Copy the `slimdash/` folder to the Home Assistant `addons` share (Samba:
   `\\HA_IP\addons\slimdash`).
2. **Settings → Apps → App store**, menu ⋮ → **Check for updates**.
3. **Local apps** section → **SlimDash** → **Install**, then **Start**.
4. Configure the published dashboards in the **Configuration** tab (see
   [slimdash/DOCS.md](slimdash/DOCS.md)).
5. On the device: `http://HA_IP:8099/<name>` (e.g. `http://192.168.1.10:8099/kitchen`).

`http://HA_IP:8099/` lists the published dashboards. Diagnostics: `http://HA_IP:8099/debug`
(server) and `http://HA_IP:8099/diag` (open it on a device: what its browser reports and the
type detected).

## Repository layout

| Path | Content |
|---|---|
| `slimdash/` | The app: `config.yaml`, `Dockerfile`, translations, store description and documentation. |
| `slimdash/app/slimdash.py` | Server: options, Home Assistant connection, routes, cameras, Frigate. |
| `slimdash/app/render.py` | Lovelace → HTML rendering of each card. |
| `slimdash/app/theme.py` | Home Assistant themes → CSS. |
| `slimdash/app/static/` | `s.css` (all types), `c-t2.css`, `c-t3.css`, `s.js` (ES5). |
| `dev/` | Fake Home Assistant, test dashboards, rendering snapshots. |
| `docs/` | Rendering notes and change review (French). |

## Development on a PC

Requirements: Python 3 with `aiohttp`.

Start the fake Home Assistant (port 8124; `MOCK_FIXTURE` = Lovelace config to serve,
`MOCK_FRIGATE` = Frigate `host:port` to announce, empty = no Frigate):

```bash
MOCK_FRIGATE= python dev/mock_ha.py
```

Then, in another terminal, start SlimDash against it:

```bash
HA_URL=http://127.0.0.1:8124 HA_TOKEN=x SLIMDASH_OPTIONS=dev/options.json python slimdash/app/slimdash.py
```

PowerShell:

```powershell
$env:HA_URL="http://127.0.0.1:8124"; $env:HA_TOKEN="x"; $env:SLIMDASH_OPTIONS="dev/options.json"; python slimdash/app/slimdash.py
```

Page: http://127.0.0.1:8099/ — diagnostics: http://127.0.0.1:8099/debug.
`SLIMDASH_PORT` sets another port, to run several instances side by side. To try a type in a
desktop browser, add `?type=1`, `?type=2` or `?type=3` to the address.

Against the real Home Assistant: `HA_URL=http://HA_IP:8123` and `HA_TOKEN=<long-lived token>`.

### Rendering regression check

```bash
python dev/snapshot.py check
```

The script starts the fake Home Assistant, SlimDash and a headless Edge or Chrome by itself,
then compares the position, size, font and colors of every element, for all test views and
the three types, with the reference in `dev/snapshots/`. After an intended rendering change:
`python dev/snapshot.py save`.

## License

SlimDash is free software, under the [GNU Affero General Public License v3.0](LICENSE) or any later
version. Copyright (C) 2026 myB0B.

You may use, study, modify and share it. If you share it (or a modified version), you must keep this
same license and give the source of your changes, including when it is offered to others as a
network service. It cannot be turned into a closed, proprietary product.

**No warranty, no liability.** SlimDash is provided « as is »: see sections 15 and 16 of the
license. Running old, unsupported devices on a network has real risks (overheating batteries,
unpatched security flaws, see the Warning in the [documentation](slimdash/DOCS.md)); how you use it
is your own responsibility.

Third-party material: the Roboto font (SIL Open Font License 1.1, see `slimdash/app/fonts/OFL.txt`)
and the Material Design Icons by Pictogrammers (Apache License 2.0).
