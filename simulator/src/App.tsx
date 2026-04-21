import { useDeferredValue } from 'react';
import { getLessonDefinition } from '../../shared/src';
import { AlignmentPanel } from './components/AlignmentPanel';
import { EventFeed } from './components/EventFeed';
import { PresencePanel } from './components/PresencePanel';
import { QuizPanel } from './components/QuizPanel';
import { ScoreboardPanel } from './components/ScoreboardPanel';
import { SessionPanel } from './components/SessionPanel';
import { SpatialWorkspace } from './components/SpatialWorkspace';
import { useRoomClient } from './hooks/useRoomClient';

export const App = () => {
  const roomClient = useRoomClient();
  const currentPlayer = roomClient.roomState?.participants[roomClient.playerId] ?? null;
  const lesson = getLessonDefinition(roomClient.roomState?.lessonId ?? 'molecule-builder');
  const logFeed = useDeferredValue([...(roomClient.roomState?.diagnostics ?? []), ...roomClient.localLogs].sort((left, right) => right.timestamp - left.timestamp));

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">RoomLab</p>
          <h1>Co-located molecule learning for multiplayer Spectacles-style XR</h1>
          <p className="hero-copy">
            RoomLab is a shared spatial learning prototype where nearby learners align into the same coordinate space,
            assemble molecules together, and answer synchronized reinforcement prompts in real time.
          </p>
        </div>

        <div className="hero-badges">
          <span className="hero-badge">2 to 4 players</span>
          <span className="hero-badge">Shared spatial anchor</span>
          <span className="hero-badge">Authoritative room state</span>
          <span className="hero-badge">{roomClient.transportMode === 'browser' ? 'Vercel-safe browser transport' : 'Relay transport'}</span>
          <span className="hero-badge">{lesson.title}</span>
        </div>
      </header>

      <main className="layout-grid">
        <div className="left-column">
          <SessionPanel
            roomState={roomClient.roomState}
            currentPlayer={currentPlayer}
            transportMode={roomClient.transportMode}
            roomId={roomClient.roomId}
            displayName={roomClient.displayName}
            serverUrl={roomClient.serverUrl}
            connectionStatus={roomClient.connectionStatus}
            connectionError={roomClient.connectionError}
            onTransportModeChange={roomClient.setTransportMode}
            onRoomIdChange={roomClient.setRoomId}
            onDisplayNameChange={roomClient.setDisplayName}
            onServerUrlChange={roomClient.setServerUrl}
            onHost={roomClient.hostRoom}
            onJoin={roomClient.joinRoom}
            onReadyChange={roomClient.setReady}
            onReset={roomClient.resetRoom}
            onResync={roomClient.requestResync}
          />

          <AlignmentPanel
            roomState={roomClient.roomState}
            currentPlayer={currentPlayer}
            onEstablishSharedOrigin={roomClient.establishSharedOrigin}
            onConfirmAlignment={roomClient.confirmAlignment}
            onSpawnLesson={roomClient.spawnLesson}
          />
        </div>

        <div className="center-column">
          <SpatialWorkspace
            roomState={roomClient.roomState}
            currentPlayer={currentPlayer}
            onPickup={roomClient.pickupAtom}
            onMove={roomClient.moveAtom}
            onPlace={roomClient.placeAtom}
            onRelease={roomClient.releaseAtom}
          />

          <div className="panel panel-summary">
            <div className="panel-heading">
              <p className="eyebrow">Lesson design</p>
              <h2>Why this feels educational, not gamey</h2>
            </div>
            <div className="summary-grid">
              <div>
                <strong>Scaffolded sequence</strong>
                <p>Water introduces bent geometry, carbon dioxide reinforces linearity, and methane ends with a four-bond tetrahedral arrangement.</p>
              </div>
              <div>
                <strong>Immediate feedback</strong>
                <p>Correct placement snaps into a shared model, completion reveals a quick fact, and the synchronized quiz checks understanding right away.</p>
              </div>
              <div>
                <strong>Collaborative reasoning</strong>
                <p>Players can talk through which atom belongs at the center, who should hold which object, and why the geometry matters.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="right-column">
          <ScoreboardPanel roomState={roomClient.roomState} />
          <PresencePanel roomState={roomClient.roomState} currentPlayer={currentPlayer} />
          <QuizPanel
            roomState={roomClient.roomState}
            currentPlayer={currentPlayer}
            onStartQuiz={roomClient.startQuiz}
            onSubmit={roomClient.submitQuiz}
          />
          <EventFeed logs={logFeed} />
        </div>
      </main>
    </div>
  );
};
