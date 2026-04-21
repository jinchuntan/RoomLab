# RoomLab Lens Integration Layer

This folder contains the Spectacles-oriented integration surface for RoomLab. It is intentionally written as an adapter layer instead of a fabricated Lens Studio export so the repository stays honest about what is mocked versus what is hardware-specific.

## What is real here

- The shared room schema, lesson content, multiplayer event types, and reducer logic all come from the same authoritative `shared/` code used by the browser simulator and relay server.
- The controller structure models how a Lens-side app would host, join, align, and render a shared RoomLab session.
- The mock adapters make the flow runnable in plain TypeScript for architecture review and unit-level verification.

## What still needs real Spectacles APIs

- A real shared-origin establishment flow using Spectacles world understanding / spatial anchoring.
- A Connected Lenses or Sync Kit transport adapter that publishes authoritative state updates or domain events.
- Hand, gaze, cursor, and grab bindings connected to Lens Studio interaction components.
- Lens Studio scene objects, materials, and prefab bindings for atoms, slot indicators, labels, and scoreboard panels.

## Recommended integration path

1. Replace `MockConnectedLensAdapter` with a Connected Lenses session wrapper.
2. Replace `MockAlignmentAdapter` with a hardware-backed shared-origin calibration flow.
3. Bind `RoomLabLensController` callbacks into Lens Studio scene scripts that drive visuals and interactions.
4. Reuse the same shared event types when sending `PICKUP_ATOM`, `PLACE_ATOM`, `QUIZ_SUBMIT`, and reset events.
