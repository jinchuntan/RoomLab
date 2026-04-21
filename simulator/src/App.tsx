import { useDeferredValue } from 'react';
import { getLessonDefinition, type PlayerState, type RoomState } from '../../shared/src';
import { AlignmentPanel } from './components/AlignmentPanel';
import { EventFeed } from './components/EventFeed';
import { PresencePanel } from './components/PresencePanel';
import { QuizPanel } from './components/QuizPanel';
import { ScoreboardPanel } from './components/ScoreboardPanel';
import { SessionPanel } from './components/SessionPanel';
import { SpatialWorkspace } from './components/SpatialWorkspace';
import { useRoomClient } from './hooks/useRoomClient';

const getConnectedPlayerCount = (roomState: RoomState | null): number =>
  roomState
    ? roomState.participantOrder.filter(
        (participantId) => roomState.participants[participantId]?.presence.connectionStatus !== 'disconnected',
      ).length
    : 0;

const getAlignedPlayerCount = (roomState: RoomState | null): number =>
  roomState
    ? roomState.participantOrder.filter(
        (participantId) =>
          roomState.participants[participantId]?.presence.connectionStatus !== 'disconnected' &&
          roomState.participants[participantId]?.alignment.status === 'aligned',
      ).length
    : 0;

const getNextStep = (roomState: RoomState | null, currentPlayer: PlayerState | null): string => {
  if (!roomState || !currentPlayer) {
    return 'Pick a name, then host a room or join one.';
  }

  if (!currentPlayer.ready && (roomState.phase === 'lobby' || roomState.phase === 'alignment')) {
    return 'Mark yourself ready to continue.';
  }

  if (roomState.phase === 'alignment' && !roomState.coLocation.sharedOrigin.establishedAt) {
    return currentPlayer.isHost
      ? 'Establish the shared origin to unlock the lesson.'
      : 'Wait for the host to establish the shared origin.';
  }

  if (roomState.phase === 'alignment' && currentPlayer.alignment.status !== 'aligned') {
    return 'Confirm alignment once the shared origin looks right.';
  }

  if (roomState.phase === 'lessonIntro') {
    return currentPlayer.isHost ? 'Spawn the next molecule when you are ready.' : 'Waiting for the host to start the lesson.';
  }

  if (roomState.phase === 'building') {
    return 'Drag each atom into the matching slot.';
  }

  if (roomState.phase === 'roundComplete') {
    return currentPlayer.isHost ? 'Start the quiz to continue.' : 'Waiting for the host to start the quiz.';
  }

  if (roomState.phase === 'quiz') {
    return 'Answer the current quiz question.';
  }

  return 'Reset the room to play again.';
};

export const App = () => {
  const roomClient = useRoomClient();
  const currentPlayer = roomClient.roomState?.participants[roomClient.playerId] ?? null;
  const lesson = getLessonDefinition(roomClient.roomState?.lessonId ?? 'molecule-builder');
  const logFeed = useDeferredValue(
    [...(roomClient.roomState?.diagnostics ?? []), ...roomClient.localLogs].sort(
      (left, right) => right.timestamp - left.timestamp,
    ),
  );
  const connectedPlayers = getConnectedPlayerCount(roomClient.roomState);
  const visiblePlayerCount = connectedPlayers || 1;
  const alignedPlayers = getAlignedPlayerCount(roomClient.roomState);
  const nextStep = getNextStep(roomClient.roomState, currentPlayer);

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">RoomLab</p>
          <h1>Build molecules without the wall of text.</h1>
          <p className="hero-copy">Start a room, line up, then drag atoms into place. Works solo or with extra tabs.</p>
        </div>

        <div className="hero-badges">
          <span className="hero-badge">{roomClient.transportMode === 'browser' ? 'Browser mode' : 'Relay mode'}</span>
          <span className="hero-badge">
            {visiblePlayerCount} player{visiblePlayerCount === 1 ? '' : 's'}
          </span>
          <span className="hero-badge">{alignedPlayers}/{visiblePlayerCount} aligned</span>
          <span className="hero-badge">{lesson.title}</span>
        </div>
      </header>

      <main className="app-grid">
        <aside className="sidebar-column">
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
        </aside>

        <div className="content-column">
          <section className="panel overview-panel">
            <div className="panel-heading">
              <p className="eyebrow">Overview</p>
              <h2>Next step</h2>
            </div>
            <p className="overview-copy">{nextStep}</p>

            <div className="stat-grid">
              <div className="stat-card">
                <span className="meta-label">Room</span>
                <strong>{roomClient.roomState?.roomId ?? roomClient.roomId}</strong>
              </div>
              <div className="stat-card">
                <span className="meta-label">Phase</span>
                <strong>{roomClient.roomState?.phase ?? 'setup'}</strong>
              </div>
              <div className="stat-card">
                <span className="meta-label">Players</span>
                <strong>{visiblePlayerCount}</strong>
              </div>
              <div className="stat-card">
                <span className="meta-label">Score</span>
                <strong>{roomClient.roomState?.score.teamScore ?? 0}</strong>
              </div>
            </div>
          </section>

          <SpatialWorkspace
            roomState={roomClient.roomState}
            currentPlayer={currentPlayer}
            onPickup={roomClient.pickupAtom}
            onMove={roomClient.moveAtom}
            onPlace={roomClient.placeAtom}
            onRelease={roomClient.releaseAtom}
          />

          <div className="support-grid">
            <QuizPanel
              roomState={roomClient.roomState}
              currentPlayer={currentPlayer}
              onStartQuiz={roomClient.startQuiz}
              onSubmit={roomClient.submitQuiz}
            />

            <div className="support-stack">
              <ScoreboardPanel roomState={roomClient.roomState} />
              <PresencePanel roomState={roomClient.roomState} currentPlayer={currentPlayer} />
            </div>
          </div>

          <EventFeed logs={logFeed} />
        </div>
      </main>
    </div>
  );
};
