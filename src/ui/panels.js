import { TECHS, techCost, canResearch } from '../core/tech.js';
import { UNITS } from '../core/units.js';
import { unitsAvailable } from '../core/tech.js';
import { rewardsFor, BUILDING_INFO } from '../core/economy.js';
import { TRIBES, TRIBE_IDS } from '../campaign/tribes.js';
import { LEVELS } from '../campaign/levels.js';
import { HUMAN } from '../core/game.js';

const node = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export function techPanel(state, onResearch, onClose) {
  const p = state.players[HUMAN];
  const cities = state.citiesOf(HUMAN).length;
  const root = node('div');
  root.appendChild(node('h2', null, 'Technology'));
  root.appendChild(node('p', 'sub',
    `Cost rises with city count (${cities} ${cities === 1 ? 'city' : 'cities'}). You have ${p.stars} stars.`));

  const grid = node('div', 'techgrid');
  for (let tier = 1; tier <= 3; tier++) {
    const col = node('div', 'tier');
    col.appendChild(node('h4', null, `Tier ${tier} — ${techCost(tier, cities)}★`));
    for (const [id, t] of Object.entries(TECHS)) {
      if (t.tier !== tier) continue;
      const owned = p.techs.includes(id);
      const b = node('button', `tech${owned ? ' owned' : ''}`);
      b.innerHTML = `${t.name}<br><small>${t.unlocks.join(', ')}</small>`;
      b.disabled = owned || !canResearch(p, id) || p.stars < techCost(tier, cities);
      b.onclick = () => onResearch(id);
      col.appendChild(b);
    }
    grid.appendChild(col);
  }
  root.appendChild(grid);
  const close = node('button', 'primary', 'Close');
  close.style.marginTop = '12px';
  close.onclick = onClose;
  root.appendChild(close);
  return root;
}

export function cityPanel(state, city, { onTrain, onBuild, onClose }) {
  const p = state.players[HUMAN];
  const root = node('div');
  root.appendChild(node('h2', null, `City (level ${city.level})`));
  root.appendChild(node('p', 'sub',
    `Population ${city.population}/${city.level + 1} · Units ${city.unitCount}/${city.level + 1}` +
    (city.walls ? ' · Walled (x4 defence)' : '')));

  root.appendChild(node('h4', null, 'Train'));
  const choices = node('div', 'choices');
  for (const type of unitsAvailable(p)) {
    const u = UNITS[type];
    const b = node('button', 'choice');
    b.innerHTML = `<b>${u.name} — ${u.cost}★</b><small>${u.atk} atk · ${u.def} def · ${u.maxHp} hp · ${u.mov} mov · range ${u.rng}</small>`;
    b.disabled = p.stars < u.cost || city.unitCount >= city.level + 1 || !!state.unitAt(city.x, city.y);
    b.onclick = () => onTrain(type);
    choices.appendChild(b);
  }
  root.appendChild(choices);

  const buildables = buildOptions(state, city);
  if (buildables.length) {
    root.appendChild(node('h4', null, 'Build'));
    const bg = node('div', 'choices');
    for (const opt of buildables) {
      const b = node('button', 'choice');
      b.innerHTML = `<b>${label(opt.building)} — ${opt.cost}★</b><small>at ${opt.x},${opt.y} · +${opt.pop} population</small>`;
      b.disabled = p.stars < opt.cost;
      b.onclick = () => onBuild(opt);
      bg.appendChild(b);
    }
    root.appendChild(bg);
  }

  const close = node('button', 'primary', 'Close');
  close.style.marginTop = '12px';
  close.onclick = onClose;
  root.appendChild(close);
  return root;
}

function label(id) { return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }

function buildOptions(state, city) {
  const out = [];
  const { generateActions } = state.__actions;   // injected by main to avoid a cycle
  for (const a of generateActions(state, HUMAN)) {
    if (a.type !== 'build') continue;
    const tile = state.tileAt(a.x, a.y);
    if (!tile.cityRef || tile.cityRef.x !== city.x || tile.cityRef.y !== city.y) continue;
    out.push({ ...a, cost: BUILDING_INFO[a.building].cost, pop: BUILDING_INFO[a.building].pop });
  }
  return out;
}

export function rewardModal(city, onPick) {
  const root = node('div');
  root.appendChild(node('h2', null, 'City grew'));
  root.appendChild(node('p', 'sub', `Choose one reward for this level ${city.level} city. The other is lost.`));
  const grid = node('div', 'choices');
  for (const r of rewardsFor(city)) {
    const b = node('button', 'choice');
    b.innerHTML = `<b>${r.name}</b><small>${r.desc}</small>`;
    b.onclick = () => onPick(r.id);
    grid.appendChild(b);
  }
  root.appendChild(grid);
  return root;
}

export function startMenu({ unlocked, onStart }) {
  const root = node('div');
  root.appendChild(node('h2', null, 'Polyestertopia'));
  root.appendChild(node('p', 'sub', 'A four-level campaign. Deterministic combat: every fight can be calculated before you commit.'));

  let tribe = 'imperius';
  let level = 1;

  root.appendChild(node('h4', null, 'Choose your tribe'));
  const tribeGrid = node('div', 'tribes');
  const tribeButtons = [];
  for (const id of TRIBE_IDS) {
    const t = TRIBES[id];
    const b = node('button', 'choice');
    const sw = node('span', 'swatch');
    sw.style.background = `#${t.colors.primary.toString(16).padStart(6, '0')}`;
    b.appendChild(sw);
    b.insertAdjacentHTML('beforeend', `<b>${t.name}</b><small>${t.blurb}</small>`);
    b.onclick = () => { tribe = id; paint(); };
    tribeButtons.push([id, b]);
    tribeGrid.appendChild(b);
  }
  root.appendChild(tribeGrid);

  root.appendChild(node('h4', null, 'Level'));
  const levelGrid = node('div', 'choices');
  const levelButtons = [];
  for (const l of LEVELS) {
    const b = node('button', 'choice');
    const locked = l.id > unlocked;
    b.innerHTML = `<b>${l.id}. ${l.name}</b><small>vs ${TRIBES[l.enemyTribe].name} · ${l.turnLimit} turns${locked ? ' · locked' : ''}</small>`;
    b.disabled = locked;
    b.onclick = () => { level = l.id; paint(); };
    levelButtons.push([l.id, b]);
    levelGrid.appendChild(b);
  }
  root.appendChild(levelGrid);

  const brief = node('p', 'sub');
  root.appendChild(brief);

  const go = node('button', 'primary', 'Start');
  go.style.marginTop = '8px';
  go.onclick = () => onStart(tribe, level);
  root.appendChild(go);

  function paint() {
    for (const [id, b] of tribeButtons) b.style.borderColor = id === tribe ? '#6fd3ff' : '';
    for (const [id, b] of levelButtons) b.style.borderColor = id === level ? '#6fd3ff' : '';
    brief.textContent = LEVELS.find((l) => l.id === level).brief;
  }
  paint();
  return root;
}

export function gameOverModal(result, { onRetry, onNext, onMenu, hasNext }) {
  const root = node('div');
  root.appendChild(node('h2', null, result.won ? 'Victory' : 'Defeat'));
  root.appendChild(node('p', 'sub', result.reason));
  const row = node('div', 'choices');
  if (result.won && hasNext) {
    const b = node('button', 'choice primary');
    b.innerHTML = '<b>Next level</b>';
    b.onclick = onNext;
    row.appendChild(b);
  }
  const r = node('button', 'choice');
  r.innerHTML = '<b>Retry</b>';
  r.onclick = onRetry;
  row.appendChild(r);
  const m = node('button', 'choice');
  m.innerHTML = '<b>Main menu</b>';
  m.onclick = onMenu;
  row.appendChild(m);
  root.appendChild(row);
  return root;
}
