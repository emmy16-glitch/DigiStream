import type { Socket } from 'node:net';

export type RealtimeConnection = {
  id: string;
  userId: string;
  sessionId: string;
  socket: Socket;
  rooms: Set<string>;
  awaitingPong: boolean;
  lastSessionCheckAt: number;
  messageWindowStartedAt: number;
  messageCount: number;
  operationQueue: Promise<void>;
  send: (event: unknown) => boolean;
  close: (code: number, reason: string) => void;
};

export class RealtimeHub {
  private readonly connections = new Map<string, RealtimeConnection>();
  private readonly rooms = new Map<string, Set<string>>();

  add(connection: RealtimeConnection): void {
    this.connections.set(connection.id, connection);
  }

  remove(connection: RealtimeConnection): void {
    this.connections.delete(connection.id);
    for (const room of connection.rooms) {
      this.leave(connection, room);
    }
  }

  join(connection: RealtimeConnection, room: string): void {
    if (connection.rooms.has(room)) return;
    connection.rooms.add(room);
    const members = this.rooms.get(room) ?? new Set<string>();
    members.add(connection.id);
    this.rooms.set(room, members);
  }

  leave(connection: RealtimeConnection, room: string): void {
    connection.rooms.delete(room);
    const members = this.rooms.get(room);
    if (!members) return;
    members.delete(connection.id);
    if (members.size === 0) this.rooms.delete(room);
  }

  countForUser(userId: string): number {
    let total = 0;
    for (const connection of this.connections.values()) {
      if (connection.userId === userId) total += 1;
    }
    return total;
  }

  allConnections(): RealtimeConnection[] {
    return [...this.connections.values()];
  }

  publish(room: string, event: unknown): number {
    const members = this.rooms.get(room);
    if (!members) return 0;
    let delivered = 0;
    for (const connectionId of members) {
      const connection = this.connections.get(connectionId);
      if (connection?.send(event)) delivered += 1;
    }
    return delivered;
  }

  closeAll(code = 1001, reason = 'Server shutting down'): void {
    for (const connection of this.connections.values()) {
      connection.close(code, reason);
    }
  }
}
