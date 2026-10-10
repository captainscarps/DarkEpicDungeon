const fs = require('fs');
const code = fs.readFileSync('assets/index-D6qIWtA7-p209.js', 'utf8');

console.log('--- Eagle / Companion handling in ability execution ---');
let re = /"eagle"|eagle|companion|druid-eagle/g;
let m;
while ((m = re.exec(code)) !== null) {
  console.log(`[${m.index}] ${code.substring(m.index - 40, m.index + 160)}`);
}

console.log('\n--- Where is IAIJUTSU executed? ---');
let pos = 0;
while (true) {
  const idx = code.indexOf('IAIJUTSU', pos);
  if (idx === -1) break;
  console.log(`Pos ${idx}: ${code.substring(Math.max(0, idx - 40), Math.min(code.length, idx + 140))}`);
  pos = idx + 8;
}
