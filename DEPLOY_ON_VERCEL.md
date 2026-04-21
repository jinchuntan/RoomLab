# Deploy RoomLab On Vercel

This guide walks through the fastest way to publish RoomLab as a working public demo on Vercel.

## What gets deployed

The Vercel deployment publishes the browser simulator.

That means:

- the UI is hosted publicly
- the default `Browser shared demo` transport works with no backend
- you can open the same deployed URL in two tabs and run the collaborative flow

That does not mean:

- the Node WebSocket relay in `server/` is running on Vercel
- the Spectacles / Lens integration layer is deployed as a hardware runtime

The deployment is still useful and honest because it gives you a real public link that demonstrates:

- room setup
- shared state
- co-location flow
- synchronized building and quiz progression

## Recommended deployment mode

Use this for applications, portfolio links, and recruiter/judge review:

- Frontend: Vercel
- Transport: `Browser shared demo`
- Demo method: two browser tabs on the same deployed URL

If you later want multi-device relay-backed networking, keep the same Vercel frontend and host `server/` separately on Railway, Render, or Fly.io.

## Before you start

Make sure the repo is pushed to GitHub.

Optional but recommended:

- include a polished repo description
- add screenshots or GIFs after your first deploy
- keep `VITE_ROOMLAB_DEFAULT_TRANSPORT=browser` in Vercel so the hosted demo opens in the safest mode

## Quick path

1. Push the repo to GitHub.
2. Import it into Vercel.
3. Deploy with the included `vercel.json`.
4. Open the deployed URL in two tabs.
5. Leave transport set to `Browser shared demo`.
6. Host in one tab and join in the other.

## Step-by-step in Vercel

### 1. Import the repository

In Vercel:

1. Click `Add New...`
2. Click `Project`
3. Select your RoomLab GitHub repository

### 2. Confirm build settings

This repo already includes [vercel.json](</C:/Users/NigelTan_eaub/Desktop/Miscellaneous/RoomLab/vercel.json>), so Vercel should use the correct simulator build target automatically.

Expected settings:

- Build Command: `npm run build:vercel`
- Output Directory: `dist/simulator`

If Vercel auto-detects a framework, that is fine as long as those values stay correct.

### 3. Add environment variables

Recommended:

- `VITE_ROOMLAB_DEFAULT_TRANSPORT=browser`

Optional:

- `VITE_ROOMLAB_DEFAULT_RELAY_URL=wss://your-relay-host`

Use the relay URL only if you later host the WebSocket relay somewhere else and want the simulator to default to that mode.

### 4. Deploy

Click `Deploy`.

Once the build finishes, Vercel will give you a public URL.

## How to verify the deployed app

### Fast verification checklist

1. Open the deployed URL in tab 1.
2. Open the same URL in tab 2.
3. Confirm transport shows `Browser shared demo`.
4. In tab 1, create a room such as `lab-101`.
5. In tab 2, join the same room.
6. Mark both players ready.
7. Have the host establish the shared origin.
8. Have the guest confirm alignment.
9. Spawn the lesson.
10. Move atoms in one tab and verify the other tab updates.
11. Complete the molecule and run the quiz.

### What success looks like

You should see:

- the same room id in both tabs
- synchronized participant state
- synchronized atom movement and placement
- synchronized round completion and score updates
- synchronized quiz progression

## Best demo setup for reviewers

When sharing the deployed URL:

- open two tabs side by side on desktop
- use different display names in each tab
- keep the right-side diagnostics feed visible in at least one tab
- show the transport badge so reviewers understand the demo mode

Good short script:

1. “This is the public RoomLab simulator hosted on Vercel.”
2. “I’m using the browser shared transport so the demo works without a backend.”
3. “The same lesson logic, shared state, quiz flow, and co-location model are reused by the relay-backed and Lens-oriented layers in the repo.”

## Switching to external relay later

If you later host the Node relay separately:

1. Deploy `server/` to Railway, Render, or Fly.io.
2. Copy the public `wss://` relay URL.
3. In the simulator, switch transport to `External relay`.
4. Paste the relay URL into the transport field.

You can also set:

- `VITE_ROOMLAB_DEFAULT_TRANSPORT=relay`
- `VITE_ROOMLAB_DEFAULT_RELAY_URL=wss://your-relay-host`

That turns the same Vercel frontend into a relay-backed client.

## Troubleshooting

### The deployed app opens but rooms do not sync

Check:

- both tabs are on the exact same origin
- transport is set to `Browser shared demo`
- the browser is not blocking storage or private-mode cross-tab sync behavior

Try:

- refreshing both tabs
- using a normal browser window instead of a privacy-restricted mode

### I only see one participant

Make sure the second tab actually joined the same room id.

### The relay URL does not connect

That usually means:

- the relay is not publicly reachable
- the URL uses `ws://` instead of `wss://` on an HTTPS page
- the relay host does not support WebSocket upgrades correctly

### I want a clean application link today

Use the Vercel deployment in `Browser shared demo` mode. It is the simplest reliable public demo path for this repo.

## Files involved in this deployment path

- [vercel.json](</C:/Users/NigelTan_eaub/Desktop/Miscellaneous/RoomLab/vercel.json>)
- [package.json](</C:/Users/NigelTan_eaub/Desktop/Miscellaneous/RoomLab/package.json>)
- [.env.example](</C:/Users/NigelTan_eaub/Desktop/Miscellaneous/RoomLab/.env.example>)
- [simulator/src/hooks/useRoomClient.ts](</C:/Users/NigelTan_eaub/Desktop/Miscellaneous/RoomLab/simulator/src/hooks/useRoomClient.ts>)
- [simulator/src/network/BroadcastRoomClient.ts](</C:/Users/NigelTan_eaub/Desktop/Miscellaneous/RoomLab/simulator/src/network/BroadcastRoomClient.ts>)

## Honest note for applications

If you use this link in an application, describe it like this:

“The public Vercel deployment runs the browser simulator in a backend-free shared demo mode for easy review. The repo also includes a separate authoritative WebSocket relay and Lens-facing adapter layer for stronger multiplayer and hardware integration paths.”
