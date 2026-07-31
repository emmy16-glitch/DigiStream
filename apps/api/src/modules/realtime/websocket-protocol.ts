import { randomBytes } from 'node:crypto';

export type WebSocketFrame =
  | { type: 'text'; text: string }
  | { type: 'close'; payload: Buffer }
  | { type: 'ping'; payload: Buffer }
  | { type: 'pong'; payload: Buffer };

export class WebSocketProtocolError extends Error {
  constructor(
    readonly closeCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'WebSocketProtocolError';
  }
}

type ParserOptions = {
  maxMessageBytes: number;
  expectMasked: boolean;
};

const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

function decodeText(payload: Buffer): string {
  try {
    return utf8Decoder.decode(payload);
  } catch {
    throw new WebSocketProtocolError(1007, 'The text frame was not valid UTF-8.');
  }
}

export class WebSocketFrameParser {
  private buffer: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  private fragmentChunks: Buffer[] | null = null;
  private fragmentBytes = 0;

  constructor(private readonly options: ParserOptions) {}

  push(chunk: Buffer): WebSocketFrame[] {
    if (chunk.length > 0) {
      this.buffer =
        this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk]);
    }

    const frames: WebSocketFrame[] = [];
    while (true) {
      const bufferedBefore = this.buffer.length;
      const frame = this.readFrame();
      if (frame) {
        frames.push(frame);
        continue;
      }
      if (this.buffer.length < bufferedBefore) continue;
      break;
    }
    return frames;
  }

  private readFrame(): WebSocketFrame | null {
    if (this.buffer.length < 2) return null;

    const first = this.buffer[0] ?? 0;
    const second = this.buffer[1] ?? 0;
    const final = (first & 0x80) !== 0;
    const reserved = first & 0x70;
    const opcode = first & 0x0f;
    const masked = (second & 0x80) !== 0;
    let payloadLength = second & 0x7f;
    let offset = 2;

    if (reserved !== 0) {
      throw new WebSocketProtocolError(
        1002,
        'WebSocket extensions are not enabled.',
      );
    }
    if (masked !== this.options.expectMasked) {
      throw new WebSocketProtocolError(1002, 'The frame masking bit was invalid.');
    }

    if (payloadLength === 126) {
      if (this.buffer.length < 4) return null;
      payloadLength = this.buffer.readUInt16BE(2);
      offset = 4;
    } else if (payloadLength === 127) {
      if (this.buffer.length < 10) return null;
      const high = this.buffer.readUInt32BE(2);
      const low = this.buffer.readUInt32BE(6);
      if (high !== 0 || low > this.options.maxMessageBytes) {
        throw new WebSocketProtocolError(1009, 'The WebSocket message was too large.');
      }
      payloadLength = low;
      offset = 10;
    }

    const controlFrame = opcode >= 0x8;
    if (controlFrame && (!final || payloadLength > 125)) {
      throw new WebSocketProtocolError(1002, 'The control frame was invalid.');
    }
    if (!controlFrame && payloadLength > this.options.maxMessageBytes) {
      throw new WebSocketProtocolError(1009, 'The WebSocket message was too large.');
    }

    const maskBytes = masked ? 4 : 0;
    const frameLength = offset + maskBytes + payloadLength;
    if (this.buffer.length < frameLength) return null;

    const mask = masked ? this.buffer.subarray(offset, offset + 4) : null;
    offset += maskBytes;
    const payload = Buffer.from(this.buffer.subarray(offset, offset + payloadLength));
    this.buffer = this.buffer.subarray(frameLength);

    if (mask) {
      for (let index = 0; index < payload.length; index += 1) {
        payload[index] =
          (payload[index] ?? 0) ^ (mask[index % 4] ?? 0);
      }
    }

    if (opcode === 0x8) return { type: 'close', payload };
    if (opcode === 0x9) return { type: 'ping', payload };
    if (opcode === 0xa) return { type: 'pong', payload };
    if (opcode === 0x2) {
      throw new WebSocketProtocolError(1003, 'Binary messages are not supported.');
    }

    if (opcode === 0x1) {
      if (this.fragmentChunks) {
        throw new WebSocketProtocolError(1002, 'A fragmented message was already open.');
      }
      if (final) return { type: 'text', text: decodeText(payload) };
      this.fragmentChunks = [payload];
      this.fragmentBytes = payload.length;
      return null;
    }

    if (opcode === 0x0) {
      if (!this.fragmentChunks) {
        throw new WebSocketProtocolError(1002, 'Unexpected continuation frame.');
      }
      this.fragmentBytes += payload.length;
      if (this.fragmentBytes > this.options.maxMessageBytes) {
        throw new WebSocketProtocolError(1009, 'The WebSocket message was too large.');
      }
      this.fragmentChunks.push(payload);
      if (!final) return null;

      const complete = Buffer.concat(this.fragmentChunks, this.fragmentBytes);
      this.fragmentChunks = null;
      this.fragmentBytes = 0;
      return { type: 'text', text: decodeText(complete) };
    }

    throw new WebSocketProtocolError(1002, 'The WebSocket opcode was unsupported.');
  }
}

export function encodeWebSocketFrame(
  opcode: number,
  payload: Buffer | string = Buffer.alloc(0),
  masked = false,
): Buffer {
  const body = typeof payload === 'string' ? Buffer.from(payload) : payload;
  let headerLength = 2;
  if (body.length >= 126 && body.length <= 0xffff) headerLength += 2;
  if (body.length > 0xffff) headerLength += 8;
  const maskLength = masked ? 4 : 0;
  const frame = Buffer.allocUnsafe(headerLength + maskLength + body.length);

  frame[0] = 0x80 | (opcode & 0x0f);
  let offset = 2;
  if (body.length < 126) {
    frame[1] = (masked ? 0x80 : 0) | body.length;
  } else if (body.length <= 0xffff) {
    frame[1] = (masked ? 0x80 : 0) | 126;
    frame.writeUInt16BE(body.length, 2);
    offset = 4;
  } else {
    frame[1] = (masked ? 0x80 : 0) | 127;
    frame.writeBigUInt64BE(BigInt(body.length), 2);
    offset = 10;
  }

  if (!masked) {
    body.copy(frame, offset);
    return frame;
  }

  const mask = randomBytes(4);
  mask.copy(frame, offset);
  offset += 4;
  for (let index = 0; index < body.length; index += 1) {
    frame[offset + index] = (body[index] ?? 0) ^ (mask[index % 4] ?? 0);
  }
  return frame;
}

export function encodeJsonFrame(value: unknown): Buffer {
  return encodeWebSocketFrame(0x1, JSON.stringify(value));
}

export function encodeCloseFrame(code: number, reason: string): Buffer {
  const reasonBytes = Buffer.from(reason).subarray(0, 123);
  const payload = Buffer.allocUnsafe(2 + reasonBytes.length);
  payload.writeUInt16BE(code, 0);
  reasonBytes.copy(payload, 2);
  return encodeWebSocketFrame(0x8, payload);
}
