# Co-located UX

RoomLab is explicitly designed as a co-located experience for nearby learners, not just a multiplayer room with disconnected personal views.

## Core assumption

Players are near each other and can see the same physical reference point during calibration.

This prototype calls that the “nearby-host alignment” flow:

- the host establishes the shared origin first
- joining participants stand or sit nearby
- each participant confirms that their local view lines up with the same reference point
- only aligned participants are allowed to manipulate shared learning objects

## Shared Origin Model

The room contains an explicit `sharedOrigin` anchor in `coLocation.sharedOrigin`.

Everything in the lesson is placed relative to that anchor:

- molecule slots
- atom tray layout
- scoreboard placement assumptions
- celebration and instruction panels

The browser simulator renders this as a visible shared-origin marker. The same data model is meant to map cleanly to Lens Studio world-space content.

## Alignment States

Each participant tracks:

- alignment status
- confidence
- last confirmed timestamp
- local calibration offset
- alignment instructions

That lets the experience communicate more than “connected or not.” It can say:

- waiting for host
- pending alignment
- aligned with medium or high confidence
- needs re-alignment after a late join or disconnect

## UX Flow

### 1. Lobby

- host creates the room
- guests join the room
- everyone marks ready

### 2. Shared-origin establishment

- host places the shared origin on a floor or table reference
- the room announces that the origin is established

### 3. Nearby-user confirmation

- guests perform guided nearby-host confirmation
- each guest receives aligned / pending feedback

### 4. Shared lesson start

- once connected participants are aligned, the host can spawn the lesson
- objects appear relative to the shared origin

### 5. Re-alignment

- late joiners or reconnecting users are asked to align before interacting
- the room can flag `reAlignmentNeeded` without throwing away the whole session

## Why this matters educationally

Co-location is not decorative here. It supports learning:

- learners can point at the same spatial model
- teammates can talk through the same geometry in the same physical volume
- atom movement becomes a shared teaching gesture, not a private UI action
- the teacher or facilitator can stand nearby and guide attention to the same molecule

## Browser Simulator Substitution

Because this repo cannot guarantee Spectacles APIs in this environment, the simulator uses a mock alignment flow:

- host clicks “Establish shared origin”
- guests click “Confirm nearby alignment”
- the system records alignment confidence and calibration offsets in room state

This is an explicit substitution, not a hidden fake.

## Late Join Fallback

If a player joins after the lesson has started:

- they receive the full room snapshot
- they appear as pending alignment
- the room marks re-alignment needed
- they should observe until alignment is confirmed

That keeps the shared coordinate-space story coherent even when participants enter mid-session.
