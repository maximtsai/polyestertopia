// The four tribes. Same tech tree; they differ in starting tech, the terrain
// their homeland generates, and colour palette. This is the cheap asymmetry
// that gives identity without balance cost.
export const TRIBES = {
  bardur: {
    name: 'Bardur',
    startTech: 'hunting',
    blurb: 'Cold forests, plentiful game. Strong early economy from hunting.',
    colors: { primary: 0x2d4739, secondary: 0x6f8f7a, accent: 0xd8e2dc, ground: 0x4a6b52 },
    terrain: { forest: 0.45, mountain: 0.2, field: 0.35 },
  },
  xinxi: {
    name: 'Xin-xi',
    startTech: 'climbing',
    blurb: 'Mountainous homeland. Defensive terrain and early ore.',
    colors: { primary: 0x8c2f2f, secondary: 0xc0632f, accent: 0xf2d8b8, ground: 0x7a8b5a },
    terrain: { forest: 0.2, mountain: 0.45, field: 0.35 },
  },
  imperius: {
    name: 'Imperius',
    startTech: 'organization',
    blurb: 'Open fields and fruit. Fastest city growth.',
    colors: { primary: 0x2f4f8c, secondary: 0x5b82c4, accent: 0xf0e6c8, ground: 0x6f9a4a },
    terrain: { forest: 0.2, mountain: 0.15, field: 0.65 },
  },
  oumaji: {
    name: 'Oumaji',
    startTech: 'riding',
    blurb: 'Desert plains. Early mobility, weak terrain defence.',
    colors: { primary: 0xc9a227, secondary: 0xe8c65a, accent: 0x6b4f1d, ground: 0xd9c08a },
    terrain: { forest: 0.05, mountain: 0.15, field: 0.8 },
  },
};

export const TRIBE_IDS = Object.keys(TRIBES);
