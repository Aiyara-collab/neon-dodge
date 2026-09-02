import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, startGame, stepGame, moveGame, pauseGame, resumeGame, getScore, getLevel } from '../lib/game.ts';

test('start resets a round and movement stays within three lanes', () => {
  let state = startGame(42);
  assert.equal(state.lives, 3);
  assert.equal(state.phase, 'running');
  state = moveGame(moveGame(state, -1), -1);
  assert.equal(state.lane, 0);
  state = moveGame(moveGame(moveGame(state, 1), 1), 1);
  assert.equal(state.lane, 2);
});
test('ready and paused states do not move or consume time', () => {
  const ready = createGame();
  assert.equal(stepGame(ready, 1), ready);
  const paused = pauseGame(startGame(10));
  assert.equal(stepGame(paused, 0.02), paused);
  assert.equal(moveGame(paused, 1), paused);
  assert.equal(resumeGame(paused).phase, 'running');
});
test('collecting a star adds exactly 50 and removes it', () => {
  const state = { ...startGame(1), spawnIn: 5, entities: [{ id: 1, lane: 1, y: .82, kind: 'star' }] };
  const next = stepGame(state, .02);
  assert.equal(next.stars, 1);
  assert.equal(getScore(next), 50);
  assert.equal(next.entities.length, 0);
  assert.equal(stepGame(next, .02).stars, 1);
});
test('a collision consumes one life and grants temporary protection', () => {
  const state = { ...startGame(1), spawnIn: 5, entities: [
    { id: 1, lane: 1, y: .82, kind: 'block' },
    { id: 2, lane: 1, y: .81, kind: 'block' },
  ] };
  const next = stepGame(state, .02);
  assert.equal(next.lives, 2);
  assert.equal(next.entities.length, 0);
  assert.ok(next.invulnerableUntil > next.elapsed);
});
test('last life ends the round and terminal states cannot score again', () => {
  const next = stepGame({ ...startGame(1), lives: 1, entities: [{ id: 1, lane: 1, y: .82, kind: 'block' }] }, .02);
  assert.equal(next.phase, 'lost');
  assert.equal(next.lives, 0);
  assert.equal(stepGame(next, .02), next);
});
test('60 seconds wins, caps elapsed time, and has four speed levels', () => {
  const next = stepGame({ ...startGame(2), elapsed: 59.99 }, .02);
  assert.equal(next.phase, 'won');
  assert.equal(next.elapsed, 60);
  assert.equal(getLevel(next), 4);
});
test('long stalls pause safely while invalid frame deltas are ignored', () => {
  const state = startGame(1);
  assert.equal(stepGame(state, Number.NaN), state);
  assert.equal(stepGame(state, -1), state);
  assert.equal(stepGame(state, 20).elapsed, 0);
  assert.equal(stepGame(state, 20).phase, 'paused');
});
test('seeded spawning is reproducible and keeps entities in bounds', () => {
  let a = startGame(999);
  let b = startGame(999);
  for (let i = 0; i < 300; i += 1) {
    a = stepGame(a, .02);
    b = stepGame(b, .02);
  }
  assert.deepEqual(a, b);
  assert.ok(a.entities.every((entity) => entity.lane >= 0 && entity.lane <= 2 && entity.y < 1.1));
});

test('round 1 regression: ten 100 ms frames consume one full second', () => {
  let state = { ...startGame(123), spawnIn: 10 };
  for (let frame = 0; frame < 10; frame += 1) state = stepGame(state, 0.1);
  assert.ok(Math.abs(state.elapsed - 1) < 1e-8, `elapsed was ${state.elapsed}, expected 1`);
  assert.equal(getScore(state), 10);
});

test('round 1: catch-up frames keep collision checks and stop at 60 seconds', () => {
  const state = { ...startGame(1), spawnIn: 10, entities: [{ id: 1, lane: 1, y: .79, kind: 'block' }] };
  assert.equal(stepGame(state, .2).lives, 2);
  assert.equal(stepGame({ ...startGame(1), elapsed: 59.9, spawnIn: 10 }, .2).elapsed, 60);
});

test('round 2 regression: a fatal obstacle prevents later stars from scoring in that frame', () => {
  const state = { ...startGame(1), lives: 1, spawnIn: 10, entities: [
    { id: 1, lane: 1, y: .86, kind: 'block' },
    { id: 2, lane: 1, y: .80, kind: 'star' },
  ] };
  const next = stepGame(state, .02);
  assert.equal(next.phase, 'lost');
  assert.equal(next.stars, 0);
  assert.match(next.message, /ชีวิตหมด/);
});
