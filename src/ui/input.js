import { A, apply, legalMoves, legalAttacks, legalCapture } from '../core/actions.js';
import { previewAttack, chebyshev } from '../core/combat.js';
import { UNITS, SKILL, hasSkill } from '../core/units.js';
import { upgradeOptions } from '../core/naval.js';
import { renderUnitCard } from './hud.js';
import { HUMAN } from '../core/game.js';

/**
 * Selection and click handling. Every player action goes through actions.apply,
 * the same entry point the AI uses.
 */
export function attachInput(game) {
  const canvas = game.ctx.renderer.domElement;
  let selectedId = null;
  let hoverTarget = null;

  canvas.addEventListener('pointerdown', (e) => {
    if (game.busy || game.hud.modalOpen) return;
    const tile = game.world.pickTile(e);
    if (!tile) return deselect();
    handleClick(tile);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (game.busy || !selectedId) return;
    const tile = game.world.pickTile(e);
    const unit = game.state.unitById(selectedId);
    if (!tile || !unit) return;
    const target = game.state.unitAt(tile.x, tile.y);
    const next = target && target.owner !== HUMAN && inAttackRange(unit, target) ? target : null;
    if (next !== hoverTarget) { hoverTarget = next; refreshCard(); }
  });

  window.addEventListener('keydown', (e) => {
    if (game.hud.modalOpen) return;
    if (e.key === ' ') { e.preventDefault(); game.endTurn(); }
    if (e.key === 'Escape') deselect();
    if (e.key === '+' || e.key === '=') game.ctx.setZoom(game.ctx.viewState.zoom * 1.15);
    if (e.key === '-') game.ctx.setZoom(game.ctx.viewState.zoom / 1.15);
  });

  function inAttackRange(unit, target) {
    return legalAttacks(game.state, unit).includes(target);
  }

  function handleClick(tile) {
    const state = game.state;
    const unit = selectedId ? state.unitById(selectedId) : null;
    const clickedUnit = state.unitAt(tile.x, tile.y);

    if (unit) {
      const target = clickedUnit && clickedUnit.owner !== HUMAN ? clickedUnit : null;
      if (target && inAttackRange(unit, target)) {
        act({ type: A.ATTACK, unitId: unit.id, targetId: target.id });
        return;
      }
      const move = legalMoves(state, unit).find((m) => m.x === tile.x && m.y === tile.y);
      if (move) { act({ type: A.MOVE, unitId: unit.id, x: tile.x, y: tile.y }); return; }
    }

    if (clickedUnit && clickedUnit.owner === HUMAN) { select(clickedUnit.id); return; }

    const city = state.cityAt(tile.x, tile.y);
    if (city && city.owner === HUMAN) { game.openCity(city); return; }

    deselect();
  }

  function act(action) {
    apply(game.state, action);
    game.afterAction();
    const unit = game.state.unitById(action.unitId);
    if (!unit || (unit.moved && unit.attacked)) deselect();
    else select(unit.id);
  }

  function select(id) {
    selectedId = id;
    hoverTarget = null;
    refreshHighlights();
    refreshCard();
  }

  function deselect() {
    selectedId = null;
    hoverTarget = null;
    game.world.setHighlights({});
    renderUnitCard(null);
  }

  function refreshHighlights() {
    const unit = selectedId && game.state.unitById(selectedId);
    if (!unit) return game.world.setHighlights({});
    game.world.setHighlights({
      selected: { x: unit.x, y: unit.y },
      moves: legalMoves(game.state, unit),
      attacks: legalAttacks(game.state, unit).map((u) => ({ x: u.x, y: u.y })),
    });
  }

  function refreshCard() {
    const state = game.state;
    const unit = selectedId && state.unitById(selectedId);
    if (!unit) return renderUnitCard(null);
    const base = UNITS[unit.type];
    const rows = [
      ['Health', `${unit.hp}/${unit.maxHp}`],
      ['Attack / Defence', `${base.atk} / ${base.def}`],
      ['Move / Range', `${base.mov} / ${base.rng}`],
      ['Status', [
        unit.veteran ? 'veteran' : null,
        unit.carrying ? `carrying ${UNITS[unit.carrying.type].name}` : null,
        unit.moved ? 'moved' : null,
        unit.attacked ? 'done' : null,
      ].filter(Boolean).join(', ') || 'ready'],
    ];

    let preview = null;
    if (hoverTarget) {
      const r = previewAttack(state, unit, hoverTarget);
      preview =
        `vs ${UNITS[hoverTarget.type].name} (${hoverTarget.hp} hp) — ` +
        `you deal <span class="dmg">${r.attackDamage}</span>` +
        (r.defenseDamage ? `, take <span class="ret">${r.defenseDamage}</span>` : ', no retaliation') +
        (r.defenderDies ? ' — <b>kills</b>' : '') +
        `<br>defence bonus x${r.defenseBonus}`;
    }

    const actions = [];
    if (legalCapture(state, unit)) {
      actions.push({ label: 'Capture city', className: 'primary', onClick: () => act({ type: A.CAPTURE, unitId: unit.id }) });
    }
    if (!unit.moved && !unit.attacked && unit.hp < unit.maxHp) {
      actions.push({ label: 'Recover', onClick: () => act({ type: A.RECOVER, unitId: unit.id }) });
    }
    for (const to of upgradeOptions(state, unit, state.players[HUMAN])) {
      actions.push({
        label: `Upgrade to ${UNITS[to].name} (${UNITS[to].cost}★)`,
        disabled: state.players[HUMAN].stars < UNITS[to].cost,
        onClick: () => act({ type: A.UPGRADE, unitId: unit.id, to }),
      });
    }
    actions.push({ label: 'Skip', onClick: () => { unit.moved = true; unit.attacked = true; game.afterAction(); deselect(); } });

    renderUnitCard({ title: UNITS[unit.type].name, rows, preview, actions });
  }

  return { refresh: () => { refreshHighlights(); refreshCard(); }, deselect, select };
}
