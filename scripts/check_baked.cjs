const fs = require('fs');
const code = fs.readFileSync('assets/index-D6qIWtA7-p209.js', 'utf8');
let pos = 0;
while (true) {
  const idx = code.indexOf('bakedWeapon', pos);
  if (idx === -1) break;
  console.log(`Pos ${idx}: ${code.substring(Math.max(0, idx - 40), Math.min(code.length, idx + 100))}`);
  pos = idx + 11;
}
