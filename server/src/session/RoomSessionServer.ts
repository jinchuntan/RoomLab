import { createServer, type IncomingMessage } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import {
  createHydrationPayload,
  createRoomError,
  createRoomLabLogger,
  createRoomState,
  getLessonDefinition,
  reduceRoomEvent,
  type ClientEnvelope,
  type RoomClientEvent,
  type RoomDomainEvent,
  type RoomServerMessage,
  type RoomState,
} from '../../../shared/src';
import type { ConnectionContext } from './InMemoryRoomRegistry';
import { InMemoryRoomRegistry } from './InMemoryRoomRegistry';

const ROOM_ID_PATTERN = /^[a-z0-9-]{3,16}$/i;

export interface RoomSessionServerOptions {
  port?: number;
}

export class RoomSessionServer {
  private readonly registry = new InMemoryRoomRegistry();

  private readonly port: number;

  private readonly logger = createRoomLabLogger('network');

  public constructor(options?: RoomSessionServerOptions) {
    this.port = options?.port ?? 8787;
  }

  public start(): void {
    const server = createServer((request, response) => {
      if (request.url === '/health') {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ ok: true, service: 'roomlab-relay', time: Date.now() }));
        return;
      }

      response.writeHead(404, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: false, error: 'Not found' }));
    });

    const wss = new WebSocketServer({ server });

    wss.on('connection', (socket, request) => {
      this.handleConnection(socket, request);
    });

    server.listen(this.port, () => {
      this.logger.info(`RoomLab relay listening on port ${this.port}.`);
    });
  }

  private handleConnection(socket: WebSocket, request: IncomingMessage): void {
    const connectionId = randomUUID();
    const connection: ConnectionContext = {
      connectionId,
      socket,
      roomId: null,
      playerId: null,
    };

    this.registry.addConnection(connection);
    this.sendMessage(connection, {
      type: 'CONNECTED',
      payload: {
        connectionId,
        serverTime: Date.now(),
      },
    });
    this.logger.info('Client connected.', {
      connectionId,
      userAgent: request.headers['user-agent'] ?? 'unknown',
    });

    socket.on('message', (raw: RawData) => {
      this.handleMessage(connectionId, raw);
    });

    socket.on('close', () => {
      this.handleClose(connectionId);
    });

    socket.on('error', (error: Error) => {
      this.logger.warn('Socket error encountered.', {
        connectionId,
        message: error.message,
      });
    });
  }

  private handleMessage(connectionId: string, raw: RawData): void {
    const connection = this.registry.getConnection(connectionId);
    if (!connection) {
      return;
    }

    let envelope: ClientEnvelope;
    try {
      envelope = JSON.parse(raw.toString()) as ClientEnvelope;
    } catch {
      this.sendRejected(connection, 'unknown', createRoomError('INVALID_STATE_TRANSITION', 'Malformed JSON message received.', true));
      return;
    }

    const event = envelope.event;
    if (!event) {
      this.sendRejected(connection, envelope.eventId ?? 'unknown', createRoomError('INVALID_STATE_TRANSITION', 'Missing event payload.', true));
      return;
    }

    switch (event.type) {
      case 'CREATE_ROOM':
        this.handleCreateRoom(connection, envelope as ClientEnvelope<Extract<RoomClientEvent, { type: 'CREATE_ROOM' }>>);
        return;
      case 'JOIN_ROOM':
        this.handleJoinRoom(connection, envelope as ClientEnvelope<Extract<RoomClientEvent, { type: 'JOIN_ROOM' }>>);
        return;
      case 'REQUEST_STATE_SYNC':
        this.handleStateSyncRequest(connection, event.payload.roomId, envelope.eventId, event.payload.reason);
        return;
      case 'HEARTBEAT':
        this.handleHeartbeat(connection, envelope as ClientEnvelope<Extract<RoomClientEvent, { type: 'HEARTBEAT' }>>);
        return;
      default:
        this.handleDomainEvent(connection, envelope as ClientEnvelope<Exclude<RoomClientEvent, { type: 'CREATE_ROOM' | 'JOIN_ROOM' | 'REQUEST_STATE_SYNC' | 'HEARTBEAT' }>>);
    }
  }

  private handleCreateRoom(
    connection: ConnectionContext,
    envelope: ClientEnvelope<Extract<RoomClientEvent, { type: 'CREATE_ROOM' }>>,
  ): void {
    const { roomId, lessonId, playerId, displayName } = envelope.event.payload;
    if (!ROOM_ID_PATTERN.test(roomId)) {
      this.sendRejected(connection, envelope.eventId, createRoomError('INVALID_ROOM_ID', 'Room id must be 3 to 16 letters, numbers, or hyphens.', true));
      return;
    }

    if (this.registry.roomExists(roomId)) {
      this.sendRejected(connection, envelope.eventId, createRoomError('DUPLICATE_ROOM', `Room ${roomId} already exists.`, true));
      return;
    }

    const lesson = getLessonDefinition(lessonId);
    const state = createRoomState({
      roomId,
      lesson,
      hostId: playerId,
      displayName,
      now: envelope.timestamp,
    });

    this.registry.createRoom(roomId, lesson, state);
    this.registry.attachConnectionToRoom(connection.connectionId, roomId, playerId);
    this.logger.info('Room created.', {
      roomId,
      lessonId: lesson.id,
      hostId: playerId,
    });

    this.broadcastState(roomId, 'create');
  }

  private handleJoinRoom(
    connection: ConnectionContext,
    envelope: ClientEnvelope<Extract<RoomClientEvent, { type: 'JOIN_ROOM' }>>,
  ): void {
    const room = this.registry.getRoom(envelope.event.payload.roomId);
    if (!room) {
      this.sendRejected(connection, envelope.eventId, createRoomError('ROOM_NOT_FOUND', `Room ${envelope.event.payload.roomId} does not exist.`, true));
      return;
    }

    const domainEvent = this.toDomainEvent(envelope);
    const result = reduceRoomEvent(room.state, domainEvent, room.lesson);
    if (!result.accepted || result.error) {
      this.sendRejected(connection, envelope.eventId, result.error ?? createRoomError('INVALID_STATE_TRANSITION', 'Join request rejected.', true));
      return;
    }

    this.registry.updateRoomState(room.roomId, result.state);
    this.registry.attachConnectionToRoom(connection.connectionId, room.roomId, envelope.event.payload.playerId);
    this.broadcastState(room.roomId, 'hydrate');
  }

  private handleHeartbeat(connection: ConnectionContext, envelope: ClientEnvelope<Extract<RoomClientEvent, { type: 'HEARTBEAT' }>>): void {
    const roomId = envelope.event.payload.roomId;
    const room = this.registry.getRoom(roomId);
    if (!room) {
      return;
    }

    if (!connection.playerId) {
      connection.playerId = envelope.actorId;
    }
    if (!connection.roomId) {
      connection.roomId = roomId;
    }

    const player = room.state.participants[envelope.actorId];
    if (!player) {
      return;
    }

    player.presence.lastHeartbeatAt = envelope.timestamp;
    player.presence.connectionStatus = 'connected';
    room.updatedAt = Date.now();
  }

  private handleStateSyncRequest(connection: ConnectionContext, roomId: string, _eventId: string, reason: string): void {
    const room = this.registry.getRoom(roomId);
    if (!room) {
      this.sendRejected(connection, _eventId, createRoomError('ROOM_NOT_FOUND', `Room ${roomId} does not exist.`, true));
      return;
    }

    this.logger.info('Manual state sync requested.', {
      roomId,
      reason,
      playerId: connection.playerId ?? 'unknown',
    });
    this.sendMessage(connection, {
      type: 'ROOM_STATE',
      payload: createHydrationPayload(room.state, reason === 'desync' ? 'desync' : 'hydrate'),
    });
  }

  private handleDomainEvent(
    connection: ConnectionContext,
    envelope: ClientEnvelope<
      Exclude<RoomClientEvent, { type: 'CREATE_ROOM' | 'JOIN_ROOM' | 'REQUEST_STATE_SYNC' | 'HEARTBEAT' }>
    >,
  ): void {
    const roomId = envelope.event.payload.roomId;
    const room = this.registry.getRoom(roomId);
    if (!room) {
      this.sendRejected(connection, envelope.eventId, createRoomError('ROOM_NOT_FOUND', `Room ${roomId} does not exist.`, true));
      return;
    }

    if (!connection.roomId) {
      connection.roomId = roomId;
    }
    if (!connection.playerId) {
      connection.playerId = envelope.actorId;
    }

    if (
      envelope.clientVersion !== undefined &&
      Math.abs(room.state.version - envelope.clientVersion) > 5
    ) {
      this.sendMessage(connection, {
        type: 'DESYNC_NOTICE',
        payload: {
          serverVersion: room.state.version,
          roomId,
          reason: 'Client version drift exceeded safe threshold. Requesting rehydration.',
        },
      });
      this.sendMessage(connection, {
        type: 'ROOM_STATE',
        payload: createHydrationPayload(room.state, 'desync'),
      });
      return;
    }

    const result = reduceRoomEvent(room.state, this.toDomainEvent(envelope), room.lesson);
    if (!result.accepted || result.error) {
      this.sendRejected(connection, envelope.eventId, result.error ?? createRoomError('INVALID_STATE_TRANSITION', 'Event rejected.', true), room.state);
      return;
    }

    this.registry.updateRoomState(roomId, result.state);
    this.broadcastState(roomId, 'event');
    if (result.scoreChanged) {
      this.broadcastMessage(roomId, {
        type: 'SCORE_UPDATE',
        payload: {
          score: result.state.score,
          reason: result.scoreReason ?? 'Score updated',
        },
      });
    }
  }

  private handleClose(connectionId: string): void {
    const connection = this.registry.detachConnection(connectionId);
    if (!connection?.roomId || !connection.playerId) {
      return;
    }

    const room = this.registry.getRoom(connection.roomId);
    if (!room) {
      return;
    }

    const player = room.state.participants[connection.playerId];
    if (!player || player.presence.connectionStatus === 'disconnected') {
      return;
    }

    const leaveEvent: RoomDomainEvent = {
      type: 'PLAYER_LEFT',
      payload: {
        roomId: connection.roomId,
        playerId: connection.playerId,
        reason: 'disconnect',
      },
      actorId: connection.playerId,
      eventId: `leave_${connection.playerId}_${Date.now()}`,
      timestamp: Date.now(),
    };

    const result = reduceRoomEvent(room.state, leaveEvent, room.lesson);
    if (result.accepted) {
      this.registry.updateRoomState(room.roomId, result.state);
      this.broadcastState(room.roomId, 'event');
    }

    this.logger.warn('Client disconnected.', {
      connectionId,
      roomId: connection.roomId,
      playerId: connection.playerId,
    });
  }

  private toDomainEvent<TEvent extends Exclude<RoomClientEvent, { type: 'CREATE_ROOM' }>>(
    envelope: ClientEnvelope<TEvent>,
  ): RoomDomainEvent {
    return {
      ...envelope.event,
      actorId: envelope.actorId,
      eventId: envelope.eventId,
      timestamp: envelope.timestamp,
      ...(envelope.clientVersion !== undefined ? { clientVersion: envelope.clientVersion } : {}),
    } as RoomDomainEvent;
  }

  private broadcastState(roomId: string, reason: 'create' | 'hydrate' | 'event' | 'desync'): void {
    const room = this.registry.getRoom(roomId);
    if (!room) {
      return;
    }

    this.broadcastMessage(roomId, {
      type: 'ROOM_STATE',
      payload: createHydrationPayload(room.state, reason),
    });
  }

  private broadcastMessage(roomId: string, message: RoomServerMessage): void {
    this.registry.listRoomConnections(roomId).forEach((connection) => {
      this.sendMessage(connection, message);
    });
  }

  private sendRejected(
    connection: ConnectionContext,
    eventId: string,
    error: ReturnType<typeof createRoomError>,
    state?: RoomState,
  ): void {
    const maybeRoomState = state ? createHydrationPayload(state, 'desync') : undefined;

    this.sendMessage(connection, {
      type: 'EVENT_REJECTED',
      payload: {
        eventId,
        error,
        ...(maybeRoomState ? { state: maybeRoomState } : {}),
      },
    });
  }

  private sendMessage(connection: ConnectionContext, message: RoomServerMessage): void {
    if (connection.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    connection.socket.send(JSON.stringify(message));
  }
}
