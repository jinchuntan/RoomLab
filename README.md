# RoomLab

RoomLab is a multiplayer, co-located spatial learning prototype where 2 to 4 nearby learners share the same spatial scene, assemble molecules together, inspect bond geometry, answer synchronized quiz prompts, and receive real-time feedback in a shared room state.

The project is designed to be honest and GitHub-ready for Spectacles / Reality Hack style judging. The multiplayer session model, synchronization, ownership rules, lesson flow, scoring, and browser simulator are fully implemented. Hardware-specific Spectacles / Lens Studio hooks are represented as clean adapter interfaces plus mock implementations rather than fabricated SDK claims.

## Why this matters for spatial learning

Most collaborative XR demos lean game-first. RoomLab is deliberately learning-first:

- The shared task is conceptually meaningful: players reason about central atoms, bonding sites, and molecule geometry.
- The interaction loop scaffolds understanding from assembly to reinforcement quiz rather than stopping at object manipulation.
- The co-located setup encourages nearby discussion and role division in the same physical space.
- The feedback is educational, not just celebratory: each completed molecule reveals a quick fact and a synchronized quiz sequence.

## Why this qualifies as multiplayer and co-located

- Multiple clients connect to the same room through an authoritative relay server.
- All players operate on one shared room state, one shared lesson state, and one synchronized object graph.
- Atom ownership, movement, placement, score updates, quiz answers, join/leave events, and room resets are synchronized live.
- The experience explicitly models a shared origin anchor, participant alignment status, confidence, nearby-host calibration, and late-join re-alignment.
- The browser simulator can be opened in multiple tabs or windows to demonstrate the shared coordinate-space workflow without hardware.

## Stack

- TypeScript across shared logic, server, simulator, and Lens-facing integration layer
- Lightweight Node WebSocket relay server for authoritative room state
- Browser-native shared demo transport for Vercel-safe multi-tab simulation
- React + Vite browser simulator for multiplayer debugging and demo capture
- Lens / Spectacles-oriented adapter layer with mock implementations for alignment, interaction, and sync
- Vitest for reducer and hydration tests
- ESLint + Prettier + strict TypeScript configuration

## What this prototype demonstrates

- Authoritative multiplayer room lifecycle for host/join/ready/reset
- Co-location modeling with shared-origin establishment and participant alignment
- Deterministic shared-state gameplay reducer for molecule assembly and quiz progression
- Object ownership and conflict handling for collaborative manipulation
- Late-join hydration and reconnect-aware room state
- Educational UX structure appropriate for spatial learning, not generic sandbox dragging
- Clear boundaries between networking, scene logic, interaction logic, content, and UI

## Repo Structure

```text
RoomLab/
├─ README.md
├─ docs/
│  ├─ application-summary.md
│  ├─ architecture.md
│  ├─ colocated-ux.md
│  ├─ demo-script.md
│  ├─ deployment.md
│  ├─ gameplay-loop.md
│  ├─ media-capture.md
│  └─ networking.md
├─ lens/
│  ├─ README.md
│  ├─ assets_placeholders/
│  ├─ prefabs/
│  ├─ project/
│  └─ src/
├─ server/
│  └─ src/
├─ shared/
│  └─ src/
├─ simulator/
│  ├─ index.html
│  ├─ src/
│  └─ vite.config.ts
├─ tests/
│  └─ unit/
├─ scripts/
│  └─ setup.ps1
├─ package.json
├─ tsconfig.json
├─ tsconfig.base.json
└─ eslint.config.mjs
```

### Folder-by-folder

- `shared/`: canonical lesson content, room types, networking schemas, reducer, scoring, transform helpers, and hydration utilities
- `server/`: in-memory authoritative relay server with room lifecycle, broadcast sync, late-join hydration, and disconnect handling
- `simulator/`: browser-based multiplayer preview used to verify host/join, alignment, molecule assembly, quiz flow, and diagnostics
- `lens/`: Spectacles-oriented adapter and controller layer showing where real Connected Lenses / Sync Kit / interaction APIs plug in
- `tests/`: reducer and hydration tests covering correctness, ownership, invalid placement, leave handling, and late-join behavior
- `docs/`: architecture, networking, co-location UX, deployment, demo script, and public-facing application summary
- `scripts/`: small helpers for local setup

## How To Run

### Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the relay server and simulator:

   ```bash
   npm run dev
   ```

3. Open the simulator at `http://localhost:5173`.
4. Open a second browser tab or window to simulate another participant.
5. Leave the transport on `Browser shared demo` for a no-backend multi-tab demo, or switch to `External relay` to use the authoritative WebSocket server.
6. Host a room in one tab, join the same room from the second tab, then follow the ready and alignment flow.

### Browser-only demo mode

If you just want the hosted simulator to work with no backend:

```bash
npm run dev:browser
```

This uses the browser-native shared demo transport, which synchronizes multiple tabs on the same origin. It is the default mode for Vercel deployments.

### Verification commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Demo Flow

1. Host creates `lab-101` and a second participant joins.
2. Both mark ready.
3. Host establishes the shared origin.
4. Guest confirms nearby alignment.
5. Host spawns the first lesson challenge.
6. Players drag atoms into bonding slots and watch the shared molecule snap live across both clients.
7. Completion reveals the molecule name, quick fact, and updated team score.
8. Host starts the synchronized quiz and both participants answer.
9. Host advances to the next molecule or resets the room.

See [docs/demo-script.md](docs/demo-script.md) for a judge-facing walkthrough.

## Vercel Deployment

RoomLab now supports a clean Vercel deployment path for the simulator.

### What works on Vercel directly

- the browser simulator UI
- the browser-native shared demo transport
- multi-tab demo flow on the same deployed URL

### What still requires an external service

- the raw Node WebSocket relay in `server/`
- stronger multi-device authoritative multiplayer over the internet

### Deploy steps

1. Push the repo to GitHub.
2. Import the repo into Vercel.
3. Keep the root as the project root.
4. Vercel will use [vercel.json](vercel.json), which builds the simulator and serves `dist/simulator`.
5. Optionally add:
   - `VITE_ROOMLAB_DEFAULT_TRANSPORT=browser`
   - `VITE_ROOMLAB_DEFAULT_RELAY_URL=wss://your-relay-host`

After deploy, open the Vercel URL in two tabs and use `Browser shared demo`. If you later host the relay elsewhere, switch the UI to `External relay` or set the default relay URL via env.

## Key Technical Highlights

- `shared/src/state/roomReducer.ts`: deterministic room state machine for lobby, alignment, building, quiz, completion, and reset
- `server/src/session/RoomSessionServer.ts`: authoritative real-time relay with room creation, event application, disconnect handling, and hydration
- `simulator/src/components/SpatialWorkspace.tsx`: browser scene proving synchronized object ownership, snap-to-slot behavior, and live shared state
- `lens/src/controllers/RoomLabLensController.ts`: hardware-facing orchestration layer with explicit sync, alignment, and interaction abstractions

## Educational Design Highlights

- Scaffolded progression from water to carbon dioxide to methane
- Shared problem-solving around central atom choice and bond geometry
- Immediate reinforcement through synced quiz prompts
- Team score plus individual contribution tracking
- Teacher/facilitator-friendly docs for explaining what learners should notice

## Screenshots / GIF Placeholders

Capture suggestions live in [docs/media-capture.md](docs/media-capture.md).

Recommended assets for a public repo:

- Lobby and alignment state across two tabs
- One participant moving an atom while another watches the synced update
- Completed molecule with fact card and scoreboard
- Quiz view showing synchronized progression

## Limitations And Next Steps

### Current limitations

- The playable demonstration path is the browser simulator, not an exported Lens Studio project file.
- Shared-origin alignment is modeled explicitly but mocked in software rather than backed by real Spectacles tracking APIs.
- The relay server keeps room state in memory for simplicity.
- The Vercel-safe browser transport is intended for multi-tab demos on the same device, not as a replacement for a real hosted authoritative multiplayer backend.
- The visual scene uses lightweight browser primitives rather than final XR art direction.

### Near-term next steps

- Replace the mock sync adapter with a Connected Lenses / Sync Kit session wrapper
- Bind the Lens controller to real hand, gaze, and cursor interactions in Lens Studio
- Add a facilitator mode with guided prompts and timed rounds
- Introduce additional molecules and difficulty progression
- Add lightweight analytics or session replay export for classroom debriefs

## Future Roadmap

- Real Spectacles alignment and shared-anchor calibration flow
- Voice or ping collaboration cues
- More chemistry lessons and teacher-authored content packs
- Persistent room service instead of in-memory relay
- Optional web landing page for public showcase and application links

## Related Docs

- [Architecture](docs/architecture.md)
- [Networking](docs/networking.md)
- [Co-located UX](docs/colocated-ux.md)
- [Gameplay Loop](docs/gameplay-loop.md)
- [Deployment](docs/deployment.md)
- [Deploy On Vercel](DEPLOY_ON_VERCEL.md)
- [Application Summary](docs/application-summary.md)
