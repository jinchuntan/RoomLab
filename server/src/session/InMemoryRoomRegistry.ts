import type { WebSocket } from 'ws';
import type { LessonDefinition, RoomState } from '../../../shared/src';

export interface ConnectionContext {
  connectionId: string;
  socket: WebSocket;
  roomId: string | null;
  playerId: string | null;
}

export interface RoomRecord {
  roomId: string;
  lesson: LessonDefinition;
  state: RoomState;
  connectionIds: Set<string>;
  createdAt: number;
  updatedAt: number;
}

export class InMemoryRoomRegistry {
  private readonly rooms = new Map<string, RoomRecord>();

  private readonly connections = new Map<string, ConnectionContext>();

  public addConnection(connection: ConnectionContext): void {
    this.connections.set(connection.connectionId, connection);
  }

  public getConnection(connectionId: string): ConnectionContext | undefined {
    return this.connections.get(connectionId);
  }

  public attachConnectionToRoom(connectionId: string, roomId: string, playerId: string): void {
    const connection = this.connections.get(connectionId);
    const room = this.rooms.get(roomId);

    if (!connection || !room) {
      return;
    }

    connection.roomId = roomId;
    connection.playerId = playerId;
    room.connectionIds.add(connectionId);
    room.updatedAt = Date.now();
  }

  public detachConnection(connectionId: string): ConnectionContext | undefined {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return undefined;
    }

    if (connection.roomId) {
      const room = this.rooms.get(connection.roomId);
      room?.connectionIds.delete(connectionId);
      if (room) {
        room.updatedAt = Date.now();
      }
    }

    this.connections.delete(connectionId);
    return connection;
  }

  public createRoom(roomId: string, lesson: LessonDefinition, state: RoomState): RoomRecord {
    const room: RoomRecord = {
      roomId,
      lesson,
      state,
      connectionIds: new Set<string>(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    return room;
  }

  public roomExists(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  public getRoom(roomId: string): RoomRecord | undefined {
    return this.rooms.get(roomId);
  }

  public updateRoomState(roomId: string, state: RoomState): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    room.state = state;
    room.updatedAt = Date.now();
  }

  public listRoomConnections(roomId: string): ConnectionContext[] {
    const room = this.rooms.get(roomId);
    if (!room) {
      return [];
    }

    return [...room.connectionIds]
      .map((connectionId) => this.connections.get(connectionId))
      .filter((connection): connection is ConnectionContext => Boolean(connection));
  }
}
