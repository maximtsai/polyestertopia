import { createScene } from './render/scene.js';
import { World } from './render/world.js';
import { createHud } from './ui/hud.js';
import { attachInput } from './ui/input.js';
import { techPanel, cityPanel, rewardModal, startMenu, gameOverModal } from './ui/panels.js';
import { buildGame, HUMAN, ENEMY } from './core/game.js';
import { A, apply, generateActions } from './core/actions.js';
import { evaluate } from './core/objectives.js';
import { EV } from './core/events.js';
import { UNITS } from './core/units.js';
import { takeTurn } from './ai/ai.js';
import { levelById, LEVELS } from './campaign/levels.js';
import { TRIBES } from './campaign/tribes.js';

const PROGRESS_KEY = 'polyestertopia.unlocked';

class Game {
  constructor() {
    this.ctx = createScene(document.getElementById('board'));
    this.hud = createHud();
    this.busy = false;
    this.hud.on('endTurn', () => this.endTurn());
    this.hud.on('tech', () => this.openTech());
    this.hud.on('menu', () => this.menu());
    this.ctx.resize();
    this.loop(performance.now());
  }

  get unlocked() {
    const v = parseInt(localStorage.getItem(PROGRESS_KEY) || '1', 10);
    return Number.isFinite(v) ? Math.max(1, v) : 1;
  }
  set unlocked(v) { localStorage.setItem(PROGRESS_KEY, String(v)); }

  menu() {
    this.hud.showModal(startMenu({
      unlocked: this.unlocked,
      onStart: (tribe, level) => { this.hud.hideModal(); this.start(tribe, level); },
    }));
  }

  start(tribeId, levelId) {
    this.hud.hideModal();
    if (this.world) {
      this.ctx.scene.remove(this.world.terrainGroup, this.world.entities, this.world.overlay);
    }
    this.tribeId = tribeId;
    this.levelId = levelId;
    const level = levelById(levelId);
    this.state = buildGame(level, tribeId, 1234 + levelId);
    this.state.__actions = { generateActions };   // used by the city panel
    this.world = new World(this.state, this.ctx);
    this.world.build();
    this.input = attachInput(this);
    this.wireLog();
    document.getElementById('log').innerHTML = '';
    this.hud.render(this.state);
    this.hud.flash(`${TRIBES[tribeId].name} — ${level.name}`, 2600);
    this.hud.log(level.brief);
    this.afterAction();
  }

  wireLog() {
    const name = (u) => `${TRIBES[this.state.players[u.owner].tribe].name} ${UNITS[u.type].name}`;
    this.state.events.on((ev) => {
      switch (ev.type) {
        case EV.UNIT_DIED:
          this.hud.log(`${name(ev.unit)} destroyed`); break;
        case EV.CITY_CAPTURED:
          this.hud.log(`City at ${ev.city.x},${ev.city.y} captured by ${ev.by === HUMAN ? 'you' : 'the enemy'}`); break;
        case EV.UNIT_PROMOTED:
          this.hud.log(`${name(ev.unit)} promoted to veteran`); break;
        case EV.TECH_RESEARCHED:
          if (ev.player.id === HUMAN) this.hud.log(`Researched ${ev.tech}`); break;
      }
    });
  }

  /** Called after every mutation: resync the view, the HUD and the objective. */
  afterAction() {
    this.world.sync();
    for (const tile of this.state.map.tiles) this.world.refreshTile(tile);
    this.hud.render(this.state);
    if (this.input) this.input.refresh();
    if (this.resolveRewards()) return;
    this.checkOver();
  }

  /** A city that just levelled up must pick a reward before anything else. */
  resolveRewards() {
    const city = this.state.citiesOf(HUMAN).find((c) => c.pendingReward);
    if (!city) return false;
    this.hud.showModal(rewardModal(city, (reward) => {
      this.hud.hideModal();
      apply(this.state, { type: A.REWARD, x: city.x, y: city.y, reward });
      this.afterAction();
    }));
    return true;
  }

  openCity(city) {
    this.hud.showModal(cityPanel(this.state, city, {
      onTrain: (type) => {
        apply(this.state, { type: A.TRAIN, x: city.x, y: city.y, unit: type });
        this.hud.hideModal();
        this.afterAction();
      },
      onBuild: (opt) => {
        apply(this.state, { type: A.BUILD, x: opt.x, y: opt.y, building: opt.building });
        this.hud.hideModal();
        this.afterAction();
      },
      onClose: () => this.hud.hideModal(),
    }));
  }

  openTech() {
    this.hud.showModal(techPanel(this.state, (tech) => {
      apply(this.state, { type: A.RESEARCH, tech });
      this.hud.hideModal();
      this.afterAction();
    }, () => this.hud.hideModal()));
  }

  endTurn() {
    if (this.busy || this.resolveRewards()) return;
    this.busy = true;
    this.input.deselect();
    apply(this.state, { type: A.END_TURN });
    this.world.sync();
    this.hud.flash('Enemy turn', 900);

    // Let the frame paint before the AI thinks, so the turn change is visible.
    setTimeout(() => {
      const difficulty = this.state.level.difficulty;
      let guard = 0;
      while (this.state.player.id !== HUMAN && guard++ < 8) {
        if (this.state.player.eliminated) { apply(this.state, { type: A.END_TURN }); continue; }
        takeTurn(this.state, this.state.player.id, difficulty);
      }
      this.busy = false;
      this.afterAction();
    }, 120);
  }

  checkOver() {
    const result = evaluate(this.state, this.state.objective, HUMAN);
    if (!result.over || this.state.over) return;
    this.state.over = true;
    if (result.won && this.levelId >= this.unlocked) this.unlocked = Math.min(LEVELS.length, this.levelId + 1);
    this.hud.showModal(gameOverModal(result, {
      hasNext: this.levelId < LEVELS.length,
      onRetry: () => { this.hud.hideModal(); this.start(this.tribeId, this.levelId); },
      onNext: () => { this.hud.hideModal(); this.start(this.tribeId, this.levelId + 1); },
      onMenu: () => { this.hud.hideModal(); this.menu(); },
    }));
  }

  loop(now) {
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    if (this.world) this.world.update(dt);
    this.ctx.render();
    requestAnimationFrame((t) => this.loop(t));
  }
}

const game = new Game();
game.menu();
window.game = game;   // handy for debugging in the console
