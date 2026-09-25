import assert from 'node:assert/strict';
import test from 'node:test';
import { animationShouldRun } from '../../src/rendering/aircraftLayer.ts';

test('aircraft animation only runs while a viewer and aircraft are present', () => {
  assert.equal(animationShouldRun(false, 10), false);
  assert.equal(animationShouldRun(true, 0), false);
  assert.equal(animationShouldRun(true, 1), true);
});
