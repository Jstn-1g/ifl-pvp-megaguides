import assert from 'node:assert/strict';
import test from 'node:test';
import { PUBLIC_GAME_SCENE_PATHS } from '../src/lib/public-game-scenes.mjs';

test('public game scenes are a closed, local, one-to-one mapping', () => {
  assert.equal(Object.isFrozen(PUBLIC_GAME_SCENE_PATHS), true);
  assert.deepEqual(Object.keys(PUBLIC_GAME_SCENE_PATHS).sort(), [
    'battlerite',
    'bloodline-champions',
    'gigantic',
    'gunz',
    'marvel-rivals',
  ]);
  assert.equal(new Set(Object.values(PUBLIC_GAME_SCENE_PATHS)).size, 5);
  for (const scenePath of Object.values(PUBLIC_GAME_SCENE_PATHS)) {
    assert.match(scenePath, /^\/brand\/game-scenes\/[a-z0-9-]+-v1\.webp$/);
  }
  assert.equal(PUBLIC_GAME_SCENE_PATHS['unknown-game'], undefined);
  assert.throws(() => {
    PUBLIC_GAME_SCENE_PATHS.battlerite = 'https://example.com/unreviewed.webp';
  }, TypeError);
});
