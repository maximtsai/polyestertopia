import { generateActions, apply, A } from '../core/actions.js';
import { scoreAction } from './evaluate.js';
import { think } from './strategy.js';

const MAX_ACTIONS_PER_TURN = 400;

/**
 * Greedy 1-ply utility AI.
 *
 * It repeatedly scores every legal action and plays the best positive one.
 * Because kills and captures score highest, good moves naturally happen before
 * repositioning - which is exactly the move-ordering mistake that makes the
 * original game's AI look careless.
 */
export function takeTurn(state, playerId, difficulty = 2) {
  const ctx = think(state, playerId, difficulty);
  const W = ctx.weights;

  for (let i = 0; i < MAX_ACTIONS_PER_TURN; i++) {
    const actions = generateActions(state, playerId).filter((a) => a.type !== A.END_TURN);
    if (!actions.length) break;

    // A small seeded jitter breaks ties. Without it the AI is perfectly
    // deterministic, which both makes it memorisable across replays and makes
    // the balance simulator report zero variance.
    const scored = actions
      .map((a) => ({ a, s: scoreAction(state, a, ctx, W) + state.rng.next() * W.jitter }))
      .filter((e) => Number.isFinite(e.s) && e.s > 0)
      .sort((x, y) => y.s - x.s);

    if (!scored.length) break;

    const choice = pick(scored, ctx, state);
    const ok = apply(state, choice);
    if (!ok) break;            // defensive: never spin on a rejected action

    ctx.armySize = state.unitsOf(playerId).length;
  }

  apply(state, { type: A.END_TURN });
}

/** Deliberate imperfection on easy levels: sometimes take a merely-good move. */
function pick(scored, ctx, state) {
  if (ctx.mistakeRate > 0 && state.rng.chance(ctx.mistakeRate)) {
    const top = scored.slice(0, Math.min(4, scored.length));
    return state.rng.pick(top).a;
  }
  return scored[0].a;
}
