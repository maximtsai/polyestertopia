import { mapFromRows } from './map.js';
import { GameState, makePlayer, makeCity, makeUnit } from './state.js';
import { claimTerritory } from './economy.js';
import { startTurn } from './actions.js';
import { TRIBES } from '../campaign/tribes.js';

export const HUMAN = 0;
export const ENEMY = 1;

/**
 * Turn an authored level definition into a playable GameState.
 * Levels are fully authored - no procedural generation - which is what removes
 * the "unfair random start" problem that hurts Polytopia's short games.
 */
export function buildGame(level, playerTribeId, seed = 1) {
  const map = mapFromRows(level.rows);
  const human = makePlayer(HUMAN, playerTribeId, { isHuman: true });
  const enemy = makePlayer(ENEMY, level.enemyTribe);
  human.techs.push(TRIBES[playerTribeId].startTech);
  enemy.techs.push(TRIBES[level.enemyTribe].startTech);

  const state = new GameState(map, [human, enemy], { seed, turnLimit: level.turnLimit });

  for (const r of level.resources || []) {
    const t = map.at(r.x, r.y);
    if (t) t.resource = r.res;
  }

  for (const c of level.cities) {
    const owner = c.owner === 'player' ? HUMAN : c.owner === 'enemy' ? ENEMY : null;
    const city = makeCity(owner, c.x, c.y, {
      capital: !!c.capital,
      level: c.level || 1,
      walls: !!c.walls,
    });
    state.addCity(city);
    if (owner !== null) claimTerritory(state, city);
  }

  for (const u of level.units) {
    const owner = u.owner === 'player' ? HUMAN : ENEMY;
    const unit = makeUnit(owner, u.type, u.x, u.y);
    const home = state.cityAt(u.x, u.y);
    if (home && home.owner === owner) { unit.homeCity = { x: u.x, y: u.y }; home.unitCount += 1; }
    state.addUnit(unit);
  }

  // Initial vision
  for (const p of state.players) {
    for (const u of state.unitsOf(p.id)) state.reveal(p.id, u.x, u.y, 2);
    for (const c of state.citiesOf(p.id)) state.reveal(p.id, c.x, c.y, 2);
  }

  state.level = level;
  state.objective = level.objective;
  startTurn(state);
  return state;
}
