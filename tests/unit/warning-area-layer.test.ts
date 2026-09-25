import assert from 'node:assert/strict';
import test from 'node:test';
import { removeWarningEntities } from '../../src/rendering/warningAreaLayer.ts';

test('removes every entity owned by the previous warning render', () => {
  const removed: string[] = [];
  const collection = { removeById: (id: string) => { removed.push(id); return true; } };

  removeWarningEntities(collection, ['warning-a', 'warning-b:0']);

  assert.deepEqual(removed, ['warning-a', 'warning-b:0']);
});

test('handles an empty warning render without touching the viewer collection', () => {
  let calls = 0;
  removeWarningEntities({ removeById: () => { calls += 1; return true; } }, []);
  assert.equal(calls, 0);
});
