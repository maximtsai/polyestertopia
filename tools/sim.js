import { buildGame, HUMAN, ENEMY } from '../src/core/game.js';
import { takeTurn } from '../src/ai/ai.js';
import { evaluate } from '../src/core/objectives.js';
import { scoreOf } from '../src/core/economy.js';
import { levelById } from '../src/campaign/levels.js';
import { A, apply } from '../src/core/actions.js';

/**
 * Headless AI-vs-AI balance run. The rules engine has no rendering dependency,
 * so a whole game costs microseconds and hundreds of games are cheap.
 *
 * `attacker` is the difficulty used for the human seat, `defender` for the AI.
 */
const TRIBE_CYCLE = ['imperius', 'bardur', 'xinxi', 'oumaji'];

export function simulate(levelId, tribe, { games = 50, attacker = 4, defender = null } = {}) {
  const level = levelById(levelId);
  const out = { levelId, games, wins: 0, losses: 0, turns: [], scores: [], reasons: {} };

  for (let i = 0; i < games; i++) {
    // vary both the seed and the player's tribe so the sample is not one game repeated
    const state = buildGame(level, tribe || TRIBE_CYCLE[i % TRIBE_CYCLE.length], 1000 + i * 17);
    const enemyDifficulty = defender ?? level.difficulty;
    let verdict = { over: false };
    let guard = 0;

    while (!verdict.over && guard++ < 400) {
      const seat = state.player.id;
      takeTurn(state, seat, seat === HUMAN ? attacker : enemyDifficulty);
      verdict = evaluate(state, state.objective, HUMAN);
    }

    if (verdict.won) out.wins++; else out.losses++;
    out.turns.push(state.turn);
    out.scores.push([scoreOf(state, HUMAN), scoreOf(state, ENEMY)]);
    out.reasons[verdict.reason || 'unfinished'] = (out.reasons[verdict.reason || 'unfinished'] || 0) + 1;
  }

  out.winRate = out.wins / out.games;
  out.avgTurns = avg(out.turns);
  out.avgScoreHuman = avg(out.scores.map((s) => s[0]));
  out.avgScoreEnemy = avg(out.scores.map((s) => s[1]));
  return out;
}

const avg = (xs) => Math.round(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length));
