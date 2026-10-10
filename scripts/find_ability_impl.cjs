const fs = require('fs');
const code = fs.readFileSync('assets/index-D6qIWtA7-p209.js', 'utf8');

console.log('--- Ability object definitions ---');
let re = /["']IAIJUTSU["']\s*:/g;
let m = re.exec(code);
if (m) {
  console.log('Found IAIJUTSU: at ' + m.index);
  console.log(code.substring(m.index - 50, m.index + 800));
} else {
  console.log('IAIJUTSU: not found, searching other references');
  let re2 = /IAIJUTSU/g;
  while ((m = re2.exec(code)) !== null) {
    console.log(`[${m.index}] ${code.substring(m.index - 30, m.index + 100)}`);
  }
}

console.log('\n--- Companion references (EAGLE_COMPANION / WOLF_COMPANION) ---');
let re3 = /EAGLE_COMPANION/g;
while ((m = re3.exec(code)) !== null) {
  console.log(`[${m.index}] ${code.substring(m.index - 30, m.index + 200)}`);
}
