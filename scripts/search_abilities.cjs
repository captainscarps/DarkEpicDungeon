const fs = require('fs');
const code = fs.readFileSync('assets/index-D6qIWtA7-p209.js', 'utf8');

console.log('--- Search Character Select screen ---');
let re = /pe\[|character-select|selectHero|hero-select/gi;
let m;
let count = 0;
while ((m = re.exec(code)) !== null && count < 10) {
  console.log(`[${m.index}] ${code.substring(m.index - 50, m.index + 150)}`);
  count++;
}

console.log('\n--- Abilities definition ---');
let abPos = code.indexOf('IAIJUTSU');
if (abPos !== -1) {
  console.log(code.substring(abPos - 200, abPos + 1000));
}

let abPos2 = code.indexOf('EAGLE_COMPANION');
if (abPos2 !== -1) {
  console.log('EAGLE_COMPANION at ' + abPos2 + ':\n' + code.substring(abPos2 - 100, abPos2 + 600));
}

let abPos3 = code.indexOf('WOLF_COMPANION');
if (abPos3 !== -1) {
  console.log('WOLF_COMPANION at ' + abPos3 + ':\n' + code.substring(abPos3 - 100, abPos3 + 600));
}
