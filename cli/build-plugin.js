// Копирует ядро конвертера и правила в папку плагина (плагин должен быть самодостаточным).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const plug = path.join(root, 'ino2ubi-plugin');
const copies = [
  ['cli/ino2ubi.js', 'scripts/ino2ubi.js'],
  ['constants.js', 'scripts/constants.js'],
  ['parser.js', 'scripts/parser.js'],
  ['generator.js', 'scripts/generator.js'],
  ['AI_INSTRUCTIONS.md', 'skills/ino2ubi/rules.md']
];
for (const [from, to] of copies) {
  fs.mkdirSync(path.dirname(path.join(plug, to)), { recursive: true });
  fs.copyFileSync(path.join(root, from), path.join(plug, to));
  console.log(from + ' -> ino2ubi-plugin/' + to);
}
