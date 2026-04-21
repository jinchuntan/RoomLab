# Deployment

RoomLab is designed to be easy to run locally and easy to adapt for a public demo or application link.

## Local development

```bash
npm install
npm run dev
```

This starts:

- the WebSocket relay on `ws://localhost:8787`
- the simulator on `http://localhost:5173`

## Browser-only development

If you want the simulator without the relay server:

```bash
npm run dev:browser
```

This uses the browser-native shared demo transport and works across multiple tabs on the same origin.

## Local multiplayer demo

For a quick judging or interview demo:

1. Run the relay and simulator locally.
2. Open two browser windows on the same machine or two machines on the same LAN.
3. Point both simulator clients at the same relay URL.

## LAN demo

If you want multiple laptops on the same network:

- run the relay on one machine
- expose `ROOMLAB_PORT` if needed
- point simulator clients at `ws://<host-ip>:8787`

The Vite dev server is already configured to bind to `0.0.0.0` for convenience during local testing.

## Production-style deployment path

RoomLab now has two practical deployment paths.

### Option 1: Vercel-only simulator deployment

Use this when you want a frictionless public demo link that works immediately.

- deploy the repo to Vercel
- the simulator defaults to browser-native shared mode
- open the same deployed URL in multiple tabs to demonstrate the collaborative flow

This is the easiest way to share the project publicly.

### Option 2: Vercel frontend + external relay

Use this when you want stronger multi-device multiplayer.

- deploy the static simulator build to a static host
- deploy the relay server to a small Node host

Examples:

- Vercel / Netlify / GitHub Pages for the simulator
- Railway / Render / Fly.io for the WebSocket relay

## Vercel configuration

This repo includes `vercel.json` with:

- `buildCommand`: `npm run build:vercel`
- `outputDirectory`: `dist/simulator`
- SPA rewrite to `index.html`

Optional environment variables:

- `VITE_ROOMLAB_DEFAULT_TRANSPORT=browser`
- `VITE_ROOMLAB_DEFAULT_RELAY_URL=wss://your-relay-host`

## Build outputs

```bash
npm run build
```

This produces:

- `dist/server`
- `dist/lens`
- `dist/simulator`

## Honest note on Spectacles deployment

This repository does not ship a real Lens Studio build artifact. The `lens/` folder provides the adapter and controller surface that a real Spectacles implementation would bind into.

That is intentional and documented, so the repo remains honest while still demonstrating the full multiplayer and co-location architecture.
