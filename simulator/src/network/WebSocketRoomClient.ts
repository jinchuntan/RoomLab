import type { ClientEnvelope, RoomClientEvent, RoomServerMessage } from '../../../shared/src';
import type { RoomClient, RoomClientListeners } from './RoomClient';

const createEventId = (): string => `evt_${Math.random().toString(36).slice(2, 10)}`;

export class WebSocketRoomClient implements RoomClient {
  private socket: WebSocket | null = null;

  private listeners: RoomClientListeners = {};

  public constructor(private readonly serverUrl: string) {}

  public setListeners(listeners: RoomClientListeners): void {
    this.listeners = listeners;
  }

  public async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.serverUrl);
      this.socket = socket;

      socket.addEventListener('open', () => {
        resolve();
      });

      socket.addEventListener('message', (message) => {
        this.handleMessage(message.data);
      });

      socket.addEventListener('close', () => {
        this.listeners.onClosed?.();
      });

      socket.addEventListener('error', () => {
        this.listeners.onError?.('Unable to connect to the RoomLab relay server.');
        reject(new Error('WebSocket connection failed.'));
      });
    });
  }

  public send(event: RoomClientEvent, actorId: string, clientVersion?: number): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.listeners.onError?.('WebSocket is not connected.');
      return;
    }

    const envelope: ClientEnvelope = {
      event,
      actorId,
      eventId: createEventId(),
      timestamp: Date.now(),
      ...(clientVersion !== undefined ? { clientVersion } : {}),
    };

    this.socket.send(JSON.stringify(envelope));
  }

  public disconnect(): void {
    this.socket?.close();
    this.socket = null;
  }

  private handleMessage(raw: string): void {
    let message: RoomServerMessage;
    try {
      message = JSON.parse(raw) as RoomServerMessage;
    } catch {
      this.listeners.onError?.('Received an invalid server response.');
      return;
    }

    switch (message.type) {
      case 'CONNECTED':
        this.listeners.onConnected?.(message.payload.connectionId);
        return;
      case 'ROOM_STATE':
        this.listeners.onRoomState?.(message.payload);
        return;
      case 'EVENT_REJECTED':
        this.listeners.onRejected?.(message.payload.eventId, message.payload.error, message.payload.state);
        return;
      case 'SCORE_UPDATE':
        this.listeners.onScoreUpdate?.(message.payload.score, message.payload.reason);
        return;
      case 'DESYNC_NOTICE':
        this.listeners.onDesync?.(message.payload.serverVersion, message.payload.reason);
        return;
      case 'ROOM_CLOSED':
        this.listeners.onError?.(message.payload.reason);
        return;
      case 'SESSION_LOG':
        return;
    }
  }
}
