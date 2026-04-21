# Architecture

RoomLab is organized around one shared, deterministic room state that every client understands the same way. The server acts as the authority, the browser simulator acts as the debug-friendly playable client, and the Lens layer acts as the hardware integration surface.

## System Layers

### 1. Shared domain layer

Location: `shared/src`

Responsibilities:

- Canonical TypeScript types for players, rooms, atoms, slots, score, quiz state, and network payloads
- Lesson content and sample molecule definitions
- Spatial transform helpers and shared-origin concepts
- Deterministic reducer for room transitions and gameplay rules
- Hydration helpers and diagnostics utilities

This layer is the core of the project. The server, simulator, tests, and Lens adapters all depend on it.

### 2. Session / network layer

Location: `server/src`

Responsibilities:

- Accept WebSocket connections
- Create and join rooms
- Apply domain events through the shared reducer
- Broadcast authoritative room snapshots
- Handle disconnects, host migration, desync recovery, and late-join hydration

The server does not implement molecule logic itself. It delegates all room-state changes to the shared reducer so the behavior stays deterministic.

For hosted simulator demos, `simulator/src/network` adds a second transport path:

- `WebSocketRoomClient` for the external authoritative relay
- `BroadcastRoomClient` for browser-native multi-tab demos that can run on Vercel with no backend

### 3. Scene / anchor layer

Locations: `shared/src/utils/transforms.ts`, `shared/src/types/domain.ts`, `lens/src/adapters/AlignmentAdapter.ts`

Responsibilities:

- Represent the shared origin anchor explicitly
- Track participant alignment state and confidence
- Convert between local and shared transforms
- Model nearby-host calibration and re-alignment

The simulator uses a mock alignment flow. The Lens layer exposes the same contract so a real Spectacles implementation can replace it later without changing the lesson logic.

### 4. Interaction layer

Locations: `simulator/src/components/SpatialWorkspace.tsx`, `lens/src/adapters/InteractionAdapter.ts`

Responsibilities:

- Grab / move / release semantics
- Ownership and locking flow
- Snap-to-slot placement
- Shared visual feedback for object control

The interaction layer emits domain events like `PICKUP_ATOM`, `MOVE_ATOM`, and `PLACE_ATOM`. It does not directly mutate room state.

### 5. Gameplay / rules layer

Locations: `shared/src/gameplay`, `shared/src/content`, `shared/src/state/roomReducer.ts`

Responsibilities:

- Molecule challenge definitions
- Slot expectations and tray atom configuration
- Completion logic
- Score rules
- Quiz progression

This is where the “spatial learning” identity lives. The rule system is structured to support real educational sequencing, not just freeform object dragging.

### 6. UI layer

Locations: `simulator/src/components`

Responsibilities:

- Session onboarding
- Alignment instructions
- Shared workspace visualization
- Scoreboard and participant presence
- Quiz reinforcement
- Diagnostics view

The UI is intentionally glanceable and wearable-friendly: large affordances, minimal dense menus, clear current-state messaging.

## State-Driven Architecture

RoomLab uses a state-driven architecture centered on `RoomState`.

### Primary state buckets

- `participants`: identity, readiness, connection status, alignment status, held object
- `coLocation`: shared origin anchor and alignment guidance
- `lesson`: round index, active challenge, completed challenges, celebration state
- `objects`: synchronized atom states
- `quiz`: synchronized question progression and submissions
- `score`: team total, per-player contribution, score history
- `diagnostics`: session, alignment, interaction, score, and network logs

### Why a reducer

The reducer is valuable here because the prototype needs:

- deterministic replayable logic
- one authoritative interpretation of valid versus invalid actions
- easy unit testing for multiplayer edge cases
- a clean bridge between simulator and future Spectacles clients

`shared/src/state/roomReducer.ts` is the single source of truth for event application.

## Event Flow

1. A client emits a typed room event.
2. The server validates room existence and client freshness.
3. The server applies the event through the reducer.
4. The reducer returns accepted or rejected transition results.
5. Accepted transitions update authoritative room state and broadcast a new snapshot.
6. Rejected transitions send a structured error back to the caller.

## Ownership Model

Atoms follow a simple lock model:

- `PICKUP_ATOM` grants temporary ownership if the atom is free
- `MOVE_ATOM` is accepted only from the current owner
- `PLACE_ATOM` snaps into a slot and clears ownership
- competing pickup or movement attempts are rejected
- disconnecting players release held atoms automatically

This prevents two clients from corrupting object state during collaborative manipulation.

## Honest Mock Boundaries

The repository intentionally distinguishes between what is fully implemented and what is adapter-backed:

- Fully implemented: shared state, reducer, quiz logic, scoring, multiplayer sync, browser simulator, tests
- Mocked behind interfaces: Spectacles spatial alignment, Connected Lenses transport, Lens Studio scene bindings, wearable hand/gaze integration

That split is deliberate. It keeps the code credible and transferable without pretending this environment can generate a real Spectacles export.
