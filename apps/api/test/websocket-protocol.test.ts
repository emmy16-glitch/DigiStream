import assert from 'node:assert/strict';
import test from 'node:test';
import {
  encodeWebSocketFrame,
  WebSocketFrameParser,
  WebSocketProtocolError,
} from '../src/modules/realtime/websocket-protocol.js';

test('WebSocket frame protocol parses masked text and coalesced fragments', () => {
  const parser = new WebSocketFrameParser({
    maxMessageBytes: 1_024,
    expectMasked: true,
  });

  const direct = parser.push(encodeWebSocketFrame(0x1, '{"type":"ping"}', true));
  assert.deepEqual(direct, [{ type: 'text', text: '{"type":"ping"}' }]);

  const firstFragment = encodeWebSocketFrame(0x1, 'hello ', true);
  firstFragment[0] = 0x01;
  const continuation = encodeWebSocketFrame(0x0, 'world', true);
  const fragmented = parser.push(Buffer.concat([firstFragment, continuation]));
  assert.deepEqual(fragmented, [{ type: 'text', text: 'hello world' }]);
});

test('WebSocket frame protocol enforces client masking and message limits', () => {
  const parser = new WebSocketFrameParser({
    maxMessageBytes: 16,
    expectMasked: true,
  });

  assert.throws(
    () => parser.push(encodeWebSocketFrame(0x1, 'unmasked')),
    (error: unknown) =>
      error instanceof WebSocketProtocolError && error.closeCode === 1002,
  );

  const limited = new WebSocketFrameParser({
    maxMessageBytes: 4,
    expectMasked: true,
  });
  assert.throws(
    () => limited.push(encodeWebSocketFrame(0x1, '12345', true)),
    (error: unknown) =>
      error instanceof WebSocketProtocolError && error.closeCode === 1009,
  );
});

test('WebSocket frame protocol handles ping and rejects binary frames', () => {
  const parser = new WebSocketFrameParser({
    maxMessageBytes: 1_024,
    expectMasked: true,
  });

  assert.deepEqual(parser.push(encodeWebSocketFrame(0x9, 'ok', true)), [
    { type: 'ping', payload: Buffer.from('ok') },
  ]);
  assert.throws(
    () => parser.push(encodeWebSocketFrame(0x2, Buffer.from([1]), true)),
    (error: unknown) =>
      error instanceof WebSocketProtocolError && error.closeCode === 1003,
  );
});
