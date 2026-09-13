import { scoreOf } from './economy.js';

/**
 * Per-level win/lose evaluation. Each level definition supplies an objective
 * descriptor; this module turns it into a verdict after every turn.
 */
export function evaluate(state, objective, humanId = 0) {
  const human = state.players.find((p) => p.id === humanId);
  const enemies = state.players.filter((p) => p.id !== humanId);

  if (human.eliminated || (state.citiesOf(humanId).length === 0 && state.unitsOf(humanId).length === 0)) {
    return { over: true, won: false, reason: 'You were wiped out.' };
  }

  switch (objective.kind) {
    case 'capture_capital': {
      const cap = state.cities.find((c) => c.capital && c.x === objective.x && c.y === objective.y);
      if (cap && cap.owner === humanId) return { over: true, won: true, reason: 'Enemy capital taken.' };
      break;
    }
    case 'score': {
      if (scoreOf(state, humanId) >= objective.target) {
        return { over: true, won: true, reason: `Score target ${objective.target} reached.` };
      }
      break;
    }
    case 'capture_count': {
      const owned = state.citiesOf(humanId).length;
      if (owned >= objective.target) return { over: true, won: true, reason: `${objective.target} cities held.` };
      break;
    }
    case 'eliminate': {
      if (enemies.every((e) => e.eliminated)) return { over: true, won: true, reason: 'All enemies eliminated.' };
      break;
    }
  }

  if (enemies.every((e) => e.eliminated)) {
    return { over: true, won: true, reason: 'All enemies eliminated.' };
  }

  if (state.turn > state.turnLimit) {
    if (objective.kind === 'outscore') {
      const mine = scoreOf(state, humanId);
      const best = Math.max(...enemies.map((e) => scoreOf(state, e.id)));
      return { over: true, won: mine > best, reason: `Final score ${mine} vs ${best}.` };
    }
    return { over: true, won: false, reason: 'Out of turns.' };
  }
  return { over: false };
}

export function describe(objective) {
  switch (objective.kind) {
    case 'capture_capital': return 'Capture the enemy capital';
    case 'score':           return `Reach ${objective.target} score`;
    case 'capture_count':   return `Control ${objective.target} cities`;
    case 'eliminate':       return 'Eliminate the enemy';
    case 'outscore':        return 'Have the highest score at the turn limit';
    default:                return 'Survive';
  }
}
