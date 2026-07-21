const fs = require('fs');
const [, , file, jsonPath] = process.argv;
const overlay = JSON.parse(fs.readFileSync(file, 'utf8'));
const additions = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
for (const k of Object.keys(additions)) {
  overlay[k] = additions[k];
}
fs.writeFileSync(file, JSON.stringify(overlay, null, 1) + '\n');
console.log(
  'merged',
  Object.keys(additions).length,
  'into',
  file,
  'total now',
  Object.keys(overlay).length,
);
