const fs = require('fs');
const code = fs.readFileSync('assets/index-D6qIWtA7-p209.js', 'utf8');
let pos = 0;
while (true) {
  const idx = code.indexOf('SHAMAN', pos);
  if (idx === -1) break;
  console.log(`[${idx}] ${code.substring(Math.max(0, idx - 70), Math.min(code.length, idx + 90)).replace(/\s+/g,' ')}`);
  pos = idx + 6;
}
console.log('\n=== lowercase shaman ===');
pos = 0;
while (true) {
  const idx = code.indexOf('shaman', pos);
  if (idx === -1) break;
  console.log(`[${idx}] ${code.substring(Math.max(0, idx - 70), Math.min(code.length, idx + 90)).replace(/\s+/g,' ')}`);
  pos = idx + 6;
}
