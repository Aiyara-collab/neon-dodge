import test from 'node:test';
import assert from 'node:assert/strict';
import { createSwipeTracker, keyboardAction } from '../lib/input.ts';

test('round 3 regression: browser shortcuts never restart or move the game', () => {
  assert.equal(keyboardAction({ key: 'r', code: 'KeyR', ctrlKey: true }, 'running'), null);
  assert.equal(keyboardAction({ key: 'r', code: 'KeyR', metaKey: true }, 'running'), null);
  assert.equal(keyboardAction({ key: 'ArrowLeft', code: 'ArrowLeft', altKey: true }, 'running'), null);
  assert.equal(keyboardAction({ key: 'a', code: 'KeyA', ctrlKey: true }, 'running'), null);
});

test('round 4 regression: a second pointer cannot erase the first swipe', () => {
  const swipe = createSwipeTracker();
  swipe.begin({ id: 1, x: 100, y: 100 });
  assert.equal(swipe.end({ id: 2, x: 40, y: 100 }), null);
  assert.equal(swipe.end({ id: 1, x: 160, y: 100 }), 'right');
});

test('round 4: cancellation belongs to one pointer; round resets discard old gestures', () => {
  const swipe = createSwipeTracker();
  assert.equal(swipe.begin({ id: 1, x: 100, y: 100 }), true);
  assert.equal(swipe.begin({ id: 2, x: 200, y: 100 }), false);
  swipe.cancel(2);
  assert.equal(swipe.end({ id: 1, x: 60, y: 100 }), 'left');
  swipe.begin({ id: 3, x: 100, y: 100 });
  swipe.clear();
  assert.equal(swipe.end({ id: 3, x: 160, y: 100 }), null);
  swipe.begin({ id: 4, x: 100, y: 100 });
  assert.equal(swipe.end({ id: 4, x: 110, y: 200 }), null);
});

test('round 3: normal keys work but editable fields, native buttons and repeated restart are safe', () => {
  assert.equal(keyboardAction({ key: 'a', code: 'KeyA' }, 'running'), 'left');
  assert.equal(keyboardAction({ key: 'r', code: 'KeyR' }, 'running'), 'start');
  assert.equal(keyboardAction({ key: ' ', code: 'Space' }, 'paused'), 'togglePause');
  assert.equal(keyboardAction({ key: ' ', code: 'Space', buttonFocused: true }, 'running'), null);
  assert.equal(keyboardAction({ key: 'r', code: 'KeyR', editable: true }, 'running'), null);
  assert.equal(keyboardAction({ key: 'r', code: 'KeyR', repeat: true }, 'running'), null);
  assert.equal(keyboardAction({ key: 'a', code: 'KeyA', isComposing: true }, 'running'), null);
  assert.equal(keyboardAction({ key: 'r', code: 'KeyR', defaultPrevented: true }, 'running'), null);
});
