# Networking

RoomLab uses a lightweight authoritative relay server over WebSockets. The goal is not to ship a production backend in this repo; the goal is to make multiplayer behavior explicit, deterministic, and easy to inspect.

The simulator supports two transport modes:

- `External relay`: the original authoritative WebSocket server
- `Browser shared demo`: a Vercel-safe browser-native transport for multi-tab demos on the same origin

## Transport Model

- Transport: WebSocket
- Authority: server-authoritative room state
- Sync style: broadcast full-room snapshots after accepted events
- Hydration: late joiners and desynced clients receive a full room snapshot
- Keepalive: client heartbeat updates presence freshness

This approach is intentionally simple and robust for a hackathon prototype. It keeps the shared-state story easy to explain and easy to test.

For the browser shared demo mode:

- Transport: `BroadcastChannel` with local storage fallback
- Authority: serialized browser-side room updates using the same reducer
- Sync style: full-room snapshot sharing across tabs
- Scope: same-browser, same-origin demo sessions

## Core Event Types

Client-originated events modeled in `shared/src/network/events.ts`:

- `CREATE_ROOM`
- `JOIN_ROOM`
- `PLAYER_READY`
- `SET_SHARED_ORIGIN`
- `COLOCATION_CONFIRMED`
- `SPAWN_LESSON`
- `PICKUP_ATOM`
- `MOVE_ATOM`
- `PLACE_ATOM`
- `RELEASE_ATOM`
- `QUIZ_START`
- `QUIZ_SUBMIT`
- `PLAYER_LEFT`
- `ROOM_RESET`
- `HEARTBEAT`
- `REQUEST_STATE_SYNC`

Server-originated messages:

- `CONNECTED`
- `ROOM_STATE`
- `EVENT_REJECTED`
- `SCORE_UPDATE`
- `DESYNC_NOTICE`
- `SESSION_LOG`

## Authority And Conflict Resolution

The server applies every accepted gameplay event through the shared reducer. That means:

- object ownership is checked server-side
- invalid placements are rejected server-side
- quiz answers are accepted or rejected server-side
- score updates are derived from authoritative gameplay state

Conflict rules:

- first accepted pickup wins object ownership
- non-owners cannot move or place an atom
- slotted atoms are locked for this prototype
- disconnecting players lose ownership of any held objects

## Full-State Sync Strategy

RoomLab favors clarity over minimal bandwidth:

- after each accepted event, the server broadcasts a new `ROOM_STATE`
- the state includes room metadata, participants, alignment, objects, quiz, score, and diagnostics
- clients replace local authoritative room state with the incoming snapshot

For a production version, this could evolve into patch-based syncing or replicated data channels, but for a prototype this full-state approach keeps debugging and judging much easier.

## Late Join Hydration

Late joins are treated explicitly, not as an afterthought.

When a player joins an already active room:

1. The server adds them to the participant list.
2. The current room snapshot is broadcast.
3. The new player is marked as needing nearby-host alignment.
4. The room sets `reAlignmentNeeded` so the UX can prompt calibration before interaction.

This makes it clear that RoomLab supports late joins while still respecting co-location constraints.

## Desync Handling

The client sends its last known room version with each event.

If the server detects a version gap beyond a safe threshold:

- it sends `DESYNC_NOTICE`
- it follows with a fresh `ROOM_STATE`
- the client can also request `REQUEST_STATE_SYNC` manually

This is enough to demonstrate desync detection and recovery in a credible prototype without adding unnecessary complexity.

## Reconnect And Leave Handling

- sockets are tracked by room and player
- disconnecting sockets trigger `PLAYER_LEFT`
- host migration promotes the next connected participant
- disconnected players remain in room state so reconnect behavior stays explicit

This keeps session history and score context understandable even when participation changes mid-round.

## Why This Is A Good Hackathon Tradeoff

- easy to explain to judges
- easy to verify across two browser tabs
- deterministic and testable
- honest about what would later move to Connected Lenses / Sync Kit

The network shape is intentionally small, but it still demonstrates the core multiplayer engineering concepts the project needs to showcase.
