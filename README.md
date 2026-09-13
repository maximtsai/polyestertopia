# Polyestertopia

A single-player, turn-based 4X game in the shape of *The Battle of Polytopia*: a square grid,
an isometric 3D board, deterministic combat, and a four-level authored campaign.

The design bet is the same one Polytopia makes — a complete 4X arc in 10–20 minutes — with the
engineering spent on the thing single-player Polytopia does worst: **the AI opponent**.

## Running it

No build step and no npm install. three.js is loaded from a CDN through an import map.

```bash
python3 serve.py
```

Then open http://localhost:8123/ . The checks page is at http://localhost:8123/tests.html .

(If you later install Node, `npm i three && npm i -D vite` plus a `vite` dev server works with
these files unchanged — the imports are bare specifiers already. Only the import map in
`index.html` would become unnecessary.)

## Controls

- Click a unit to select it. Cyan tiles are legal moves, red tiles are legal targets.
- Hover an enemy while a unit is selected to see the exact damage both sides will take.
- Click your city (or "Open city" on a unit standing in it) to train units and build.
- `Space` ends the turn, `Esc` deselects, `+` / `-` zoom.

## Campaign

| Level | Enemy | Teaches | Objective |
|---|---|---|---|
| 1 — First Blood | Oumaji | move, attack, city defence, capture | Capture the enemy capital in 25 turns |
| 2 — Expansion | Imperius | stars, tech cost scaling, level-up rewards | Reach 1150 score in 25 turns |
| 3 — The Wall | Bardur | walls, catapults, ports and the carrier system | Hold 4 cities in 30 turns |
| 4 — Ragnarok | Xin-xi | the full ruleset, superunits | Highest score at turn 30 |

Maps are hand-authored, not generated, which removes the unfair-start problem that a 25-turn
limit makes unrecoverable.

## Layout

```
src/core/     pure rules engine - never imports three.js, fully deterministic
src/ai/       utility AI: strategy.js picks a posture, evaluate.js scores moves
src/render/   three.js scene, procedural low-poly meshes, state -> mesh sync
src/ui/       HUD, panels, input handling
src/campaign/ the four levels and the four tribes
tools/        combat fixtures and the headless balance simulator
```

The rules engine being headless is what makes `tools/sim.js` possible: a full 30-turn game runs
in a few milliseconds, so balance is measured over hundreds of games rather than guessed.

## How the AI works

Two layers, both in `src/ai`:

1. **Strategy (once per turn)** — reads city counts, army strength and threats, picks a posture
   (`expand` / `develop` / `attack` / `defend`), and from that a tech plan and a focus target.
2. **Tactics (greedy 1-ply)** — scores every legal action with a weighted sum (damage, kills,
   retaliation taken, capture value, terrain defence, exposure change, exploration) and plays the
   best positive one, repeatedly. Because kills and captures score highest, good moves happen
   before repositioning — the move-ordering failure that makes most 4X AIs look careless.

Difficulty is only a weight set plus a `mistakeRate`, so all four levels run identical code.
Measured on the same map, the level-4 weights beat the level-1 weights 97% to 13%.

Two deliberate choices worth knowing about:

- **Exposure is scored as a change, not an absolute.** Scoring it absolutely made units oscillate
  two tiles from their objective forever: advancing was punished, retreating was rewarded.
- **A small seeded jitter breaks ties**, so the AI is not bit-identical across replays and the
  balance simulator reports real variance.

## Checks

`tests.html` runs two things in the browser:

- **Combat fixtures** — known Polytopia matchups (Warrior vs Warrior = 5/5, Warrior vs a walled
  Defender = 1/12, and so on). If these drift, the combat model is wrong.
- **Balance simulation** — 30 AI-vs-AI games per level. Current baseline, with the strongest AI
  playing the human seat: L1 97%, L2 13%, L3 10%, L4 23%. That is the floor a human should beat.

## Known gaps

- Mind Bender conversion is defined but not exposed as a player action yet.
- No undo, no unit grouping, no auto-explore — the micro QoL pass is still open.
- The AI does not yet buy catapults reliably against walls; it researches the tech but usually
  spends the stars on units first.
