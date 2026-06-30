const test = require('node:test');
const assert = require('node:assert/strict');

// Use dynamic import for node-fetch or built-in fetch (Node 18+)
const BASE_URL = 'http://localhost:3001';

let server;
let app;

test.before(async () => {
  app = require('../src/index');
  // Allow server to bind
  await new Promise(r => setTimeout(r, 100));
});

test.after(async () => {
  if (server) server.close();
});

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  return { status: res.status, body: await res.json() };
}

async function del(path) {
  const res = await fetch(`${BASE_URL}${path}`, { method: 'DELETE' });
  return { status: res.status };
}


test('GET /health returns ok', async () => {
  const { status, body } = await get('/health');
  assert.equal(status, 200);
  assert.equal(body.status, 'ok');
});

test('POST /webhooks registers a webhook', async () => {
  const { status, body } = await post('/webhooks', {
    url: 'http://example.com/hook',
    events: ['scan.created'],
  });
  assert.equal(status, 201);
  assert.ok(body.id);
  assert.equal(body.url, 'http://example.com/hook');
});

test('POST /webhooks rejects missing url', async () => {
  const { status } = await post('/webhooks', { events: ['scan.created'] });
  assert.equal(status, 400);
});

test('POST /webhooks rejects empty events array', async () => {
  const { status } = await post('/webhooks', { url: 'http://example.com', events: [] });
  assert.equal(status, 400);
});

test('GET /webhooks lists registered webhooks', async () => {
  const { status, body } = await get('/webhooks');
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.webhooks));
});

test('DELETE /webhooks/:id removes a webhook', async () => {
  const { body } = await post('/webhooks', {
    url: 'http://example.com/deleteme',
    events: ['scan.updated'],
  });
  const { status } = await del(`/webhooks/${body.id}`);
  assert.equal(status, 204);
});

test('DELETE /webhooks/:id returns 404 for unknown id', async () => {
  const { status } = await del('/webhooks/non-existent-id');
  assert.equal(status, 404);
});

test('POST /notify requires event and payload', async () => {
  const { status } = await post('/notify', { event: 'scan.created' }); // missing payload
  assert.equal(status, 400);
});
