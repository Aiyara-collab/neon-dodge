import test from 'node:test';
import assert from 'node:assert/strict';
import { RECORD_KEY, parseRecord, loadRecord, saveRecord, recordCaption } from '../lib/record.ts';

test('round 5 regression: corrupted and unsafe stored scores fall back to zero', () => {
  for (const invalid of ['1e100', '1.5', '-5', 'NaN', 'Infinity', 'broken', null]) {
    assert.equal(parseRecord(invalid), 0, `invalid value ${invalid}`);
  }
  assert.equal(parseRecord('1234'), 1234);
});

test('round 5: denied storage is reported as session-only without throwing', () => {
  const denied = () => { throw new Error('Storage disabled'); };
  assert.deepEqual(loadRecord(denied), { value: 0, persistent: false });
  assert.equal(saveRecord(denied, 100), false);
  assert.equal(recordCaption(false), 'สถิติครั้งนี้ (บันทึกถาวรไม่ได้)');
});

test('round 5: a saved record reloads and write-quota failures are reported', () => {
  const data = new Map();
  const storage = () => ({ getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) });
  assert.equal(saveRecord(storage, 550), true);
  assert.equal(data.get(RECORD_KEY), '550');
  assert.deepEqual(loadRecord(storage), { value: 550, persistent: true });
  const full = () => ({ getItem: () => '550', setItem() { throw new Error('QuotaExceededError'); } });
  assert.equal(saveRecord(full, 600), false);
  assert.equal(saveRecord(storage, 1.5), false);
  assert.equal(data.get(RECORD_KEY), '550');
});
