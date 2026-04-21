# Application Summary

## Two-sentence summary

RoomLab is a co-located multiplayer spatial learning prototype where 2 to 4 nearby learners share the same anchored scene, collaboratively assemble molecules, and answer synchronized quiz prompts in real time. It demonstrates shared spatial state, authoritative multiplayer synchronization, alignment-aware co-location flow, and educational UX designed specifically for XR.

## Technical features

- Authoritative multiplayer room server with host/join, ready flow, late-join hydration, and reset support
- Shared-origin co-location model with participant alignment status, confidence, and nearby-host calibration assumptions
- Deterministic TypeScript reducer for molecule assembly, scoring, quiz progression, and ownership conflict resolution
- Browser simulator that demonstrates the multiplayer experience without hardware by opening multiple clients
- Lens / Spectacles-oriented adapter layer showing where Connected Lenses, Sync Kit, and real interaction APIs plug in
- Unit tests covering molecule validation, score updates, ownership transfer, invalid placement, player leave handling, and hydration

## Why this is a multiplayer co-located experience

- All players join the same room and operate on one shared authoritative scene state.
- Atom movement, slot placement, quiz answers, and score updates are synchronized across participants in real time.
- The experience explicitly models a shared coordinate origin and participant alignment before interaction.
- Late joiners and reconnecting players are handled through hydration plus guided re-alignment.

## What I learned from building it

- How to structure XR multiplayer around one deterministic room model instead of scattered client-side rules
- How co-location requires explicit shared-origin and alignment thinking, not just networking
- How educational UX in XR benefits from scaffolding, reinforcement, and shared meaning-making rather than pure interaction novelty

## Links

- Repo link: `<REPO_LINK_HERE>`
- Demo video link: `<DEMO_VIDEO_LINK_HERE>`
