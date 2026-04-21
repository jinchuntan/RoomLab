# Demo Script

This script is optimized for a short hackathon or application demo.

## 60-second version

“RoomLab is a co-located multiplayer spatial learning prototype for Spectacles-style XR. Two to four nearby learners align into the same shared coordinate space, collaboratively assemble molecules like water and methane, then answer synchronized quiz prompts while the whole room stays in one authoritative state.”

## 3-minute judge walkthrough

### 1. Set context

“I wanted to show that I understand more than object placement in XR. RoomLab focuses on shared spatial state, co-location, educational scaffolding, and real-time collaboration.”

### 2. Show multiplayer room setup

- create a room in the first browser tab
- join from a second tab
- point out room id, host state, participants, and readiness

Say:

“Each client joins the same room, and the server maintains one authoritative room state for participants, score, active challenge, quiz progress, and synchronized object data.”

### 3. Show co-location step

- mark both users ready
- host establishes the shared origin
- guest confirms nearby alignment

Say:

“This prototype explicitly models co-location. The host establishes the shared origin first, then other nearby users complete a guided alignment step. Even in the simulator, alignment status and confidence are first-class state.”

### 4. Show the molecule build

- spawn the water challenge
- drag oxygen and hydrogens into place from one or both tabs
- show the shared update on both clients

Say:

“When one player picks up an atom, the server grants ownership. That prevents conflicts. Once the right atom is placed into the right slot, the team gets immediate educational feedback, not just a success animation.”

### 5. Show reinforcement

- start quiz
- answer from both clients
- point out synchronized question progression and team score

Say:

“The goal is learning retention, so assembly is followed by synchronized quiz prompts around geometry, bond count, and real-world meaning.”

### 6. Close with architecture

Say:

“The shared reducer, room schema, late-join hydration, alignment model, and Lens-facing adapter layer are all in the repo. The browser simulator makes the multiplayer behavior demonstrable now, and the Lens layer shows exactly where real Spectacles APIs plug in.”

## Suggested ending line

“RoomLab is meant to be a serious starter project for co-located XR learning, not a one-off effect demo.”
