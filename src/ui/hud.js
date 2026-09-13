import { incomeOf, scoreOf } from '../core/economy.js';
import { describe } from '../core/objectives.js';
import { HUMAN } from '../core/game.js';

const el = (id) => document.getElementById(id);

export function createHud() {
  const bar = el('bar');
  const banner = el('banner');
  const logBox = el('log');
  const back = el('modalback');
  const modal = el('modal');
  const handlers = {};

  function render(state) {
    const p = state.players[HUMAN];
    bar.innerHTML = '';
    const add = (label, value, cls = '') => {
      const d = document.createElement('div');
      d.className = 'stat';
      d.innerHTML = `<b class="${cls}">${value}</b><span>${label}</span>`;
      bar.appendChild(d);
      return d;
    };
    add('turn', `${Math.min(state.turn, state.turnLimit)}/${state.turnLimit}`);
    add('stars', `${p.stars}`, 'gold');
    add('income', `+${incomeOf(state, HUMAN)}`);
    add('cities', `${state.citiesOf(HUMAN).length}`);
    add('score', `${scoreOf(state, HUMAN)}`);

    const obj = document.createElement('div');
    obj.className = 'objective grow';
    obj.textContent = `${state.level.name} — ${describe(state.objective)}`;
    bar.appendChild(obj);

    const tech = document.createElement('button');
    tech.textContent = 'Tech';
    tech.onclick = () => handlers.tech && handlers.tech();
    bar.appendChild(tech);

    const menu = document.createElement('button');
    menu.textContent = 'Menu';
    menu.onclick = () => handlers.menu && handlers.menu();
    bar.appendChild(menu);

    const end = document.createElement('button');
    end.className = 'primary';
    end.textContent = 'End turn';
    end.onclick = () => handlers.endTurn && handlers.endTurn();
    bar.appendChild(end);
  }

  function log(msg) {
    const d = document.createElement('div');
    d.textContent = msg;
    logBox.prepend(d);
    while (logBox.childElementCount > 9) logBox.lastElementChild.remove();
  }

  let bannerTimer = null;
  function flash(text, ms = 1800) {
    banner.textContent = text;
    banner.style.display = 'block';
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { banner.style.display = 'none'; }, ms);
  }

  function showModal(html) {
    modal.innerHTML = '';
    modal.appendChild(html);
    back.style.display = 'flex';
  }
  function hideModal() { back.style.display = 'none'; }

  return {
    render, log, flash, showModal, hideModal,
    on: (name, fn) => { handlers[name] = fn; },
    get modalOpen() { return back.style.display === 'flex'; },
  };
}

/** Selected-unit card with the exact damage preview the AI also sees. */
export function renderUnitCard(info) {
  const card = el('unitcard');
  if (!info) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  card.innerHTML = '';
  const h = document.createElement('h3');
  h.textContent = info.title;
  card.appendChild(h);
  for (const [k, v] of info.rows) {
    const r = document.createElement('div');
    r.className = 'row';
    r.innerHTML = `<span>${k}</span><span>${v}</span>`;
    card.appendChild(r);
  }
  if (info.preview) {
    const p = document.createElement('div');
    p.className = 'preview';
    p.innerHTML = info.preview;
    card.appendChild(p);
  }
  const actions = document.createElement('div');
  actions.className = 'actions';
  for (const a of info.actions || []) {
    const b = document.createElement('button');
    b.textContent = a.label;
    b.className = a.className || '';
    b.disabled = !!a.disabled;
    b.onclick = a.onClick;
    actions.appendChild(b);
  }
  card.appendChild(actions);
}
