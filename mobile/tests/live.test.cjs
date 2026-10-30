/* global __dirname:readonly */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Chạy logic TypeScript bằng Node, thay transport STOMP để không cần máy chủ hay thiết bị.
function loadSource(file, dependencies = {}) {
  const source = readFileSync(resolve(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, console,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return module.exports;
}

const { mergeLiveMessages } = loadSource('src/utils/live.ts');
const message = (id) => ({ id, type: 'COMMENT', content: `Message ${id}` });
const ids = (messages) => Array.from(messages, (item) => item.id);

test('REST history arriving after a socket message preserves the new message', () => {
  assert.deepEqual(ids(mergeLiveMessages([message(3)], [message(1), message(2)])), [1, 2, 3]);
});

test('history/socket overlap and replayed events do not duplicate a message', () => {
  const current = [message(1), message(2)];
  assert.deepEqual(ids(mergeLiveMessages(current, [message(2), message(3)])), [1, 2, 3]);
  assert.deepEqual(ids(current), [1, 2]);
});

test('out-of-order events are sorted and newer data replaces the same id', () => {
  const updated = { ...message(2), content: 'Updated' };
  const result = mergeLiveMessages([message(4), message(2)], [updated, message(1)]);
  assert.deepEqual(ids(result), [1, 2, 4]);
  assert.equal(result[1].content, 'Updated');
});

function connection(token, options) {
  let client;
  class MockClient {
    connected = false;
    subscriptions = new Map();
    sent = [];
    constructor(config) { this.config = config; client = this; }
    activate() {}
    deactivate() { this.connected = false; }
    subscribe(topic, handler) { this.subscriptions.set(topic, handler); }
    publish(frame) { this.sent.push(frame); }
    connect() { this.connected = true; this.config.onConnect(); }
  }
  const { connectLive } = loadSource('src/api/lives.ts', {
    '@stomp/stompjs': { Client: MockClient },
    './client': { api: {} },
    '../constants/config': { API_URL: 'http://localhost:8080' },
  });
  const events = [];
  const conn = connectLive(7, token, (event) => events.push(event), options);
  return { client, conn, events };
}

test('chat while disconnected returns false so the composer can keep its draft', () => {
  const { client, conn } = connection('jwt');
  assert.equal(conn.chat('Hello'), false);
  assert.equal(client.sent.length, 0);
});

test('authenticated viewer joins, sends chat/reaction and leaves the correct room', () => {
  const { client, conn, events } = connection('jwt');
  assert.equal(client.config.brokerURL, 'ws://localhost:8080/ws');
  assert.equal(client.config.connectHeaders.Authorization, 'Bearer jwt');
  client.connect();
  assert.equal(conn.chat('Hello'), true);
  assert.equal(conn.react('heart'), true);
  const event = { event: 'VIEWERS', viewerCount: 2 };
  client.subscriptions.get('/topic/live/7')({ body: JSON.stringify(event) });
  assert.equal(events[0].viewerCount, 2);
  conn.close();
  assert.deepEqual(client.sent.map((frame) => frame.destination), [
    '/app/live/7/join', '/app/live/7/chat', '/app/live/7/react', '/app/live/7/leave',
  ]);
});

test('host connection does not count the host as a viewer', () => {
  const { client, conn } = connection('jwt', { join: false });
  client.connect();
  conn.close();
  assert.equal(client.sent.length, 0);
});

test('server validation errors reach the UI and a reconnect rejoins the room', () => {
  const errors = [];
  const { client } = connection('jwt', { onError: (error) => errors.push(error) });
  client.connect();
  client.subscriptions.get('/user/queue/errors')({ body: JSON.stringify({ message: 'Live ended' }) });
  client.connect();
  assert.deepEqual(errors, ['Live ended']);
  assert.equal(client.sent.filter((frame) => frame.destination.endsWith('/join')).length, 2);
});
