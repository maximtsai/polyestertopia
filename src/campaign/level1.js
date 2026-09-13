// Level 1 - First Blood. Small, land only, one weak enemy.
// Teaches: move, attack, fortify in a city, capture.
export default {
  id: 1,
  name: 'First Blood',
  enemyTribe: 'oumaji',
  difficulty: 1,
  turnLimit: 25,
  brief: 'Oumaji riders have claimed the far ridge. Take their capital before turn 25. '
       + 'Units standing in a city defend at x1.5 - use that.',
  rows: [
    '...f....m..',
    '..m....f...',
    '......m....',
    '..f........',
    '.....f..f..',
    '.f.......m.',
    '....f......',
    '.m....f....',
    '.........f.',
    '..f.m..m...',
    '.....f.....',
  ],
  resources: [
    {"x": 3, "y": 8, "res": "fruit"},
    {"x": 1, "y": 9, "res": "fruit"},
    {"x": 2, "y": 9, "res": "game"},
    {"x": 8, "y": 1, "res": "fruit"},
    {"x": 7, "y": 1, "res": "game"},
    {"x": 9, "y": 2, "res": "fruit"},
    {"x": 5, "y": 4, "res": "game"},
    {"x": 4, "y": 6, "res": "game"},
    {"x": 6, "y": 5, "res": "fruit"},
  ],
  cities: [
    {"x": 2, "y": 8, "owner": "player", "capital": true, "level": 2},
    {"x": 8, "y": 2, "owner": "enemy", "capital": true, "level": 1},
  ],
  units: [
    {"x": 2, "y": 8, "owner": "player", "type": "warrior"},
    {"x": 3, "y": 9, "owner": "player", "type": "warrior"},
    {"x": 1, "y": 7, "owner": "player", "type": "rider"},
    {"x": 8, "y": 2, "owner": "enemy", "type": "warrior"},
  ],
  objective: { kind: 'capture_capital', x: 8, y: 2 },
};
