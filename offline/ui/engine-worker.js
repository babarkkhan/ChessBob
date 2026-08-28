/**
 * Runs the engine off the main thread.
 *
 * A level-5 search can take two seconds. On the main thread that would freeze the
 * board and the "Thinking" indicator, which on a touchscreen appliance reads as a
 * crashed device rather than a thinking opponent.
 */

import { chooseMove } from '../engine/index.js';

self.addEventListener('message', (event) => {
  const { fen, level } = event.data;
  try {
    const { move } = chooseMove(fen, { level });
    self.postMessage({ ok: true, move });
  } catch (error) {
    self.postMessage({ ok: false, error: String(error && error.message ? error.message : error) });
  }
});
