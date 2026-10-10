const fs = require('fs');
const code = fs.readFileSync('assets/index-D6qIWtA7-p209.js', 'utf8');

const regexes = [/portrait/gi, /assets\/pixel-art\/portraits/gi, /por\./gi];
for (const re of regexes) {
  let m;
  let count = 0;
  while ((m = re.exec(code)) !== null && count < 8) {
    console.log(`[${m.index}] ${code.substring(Math.max(0, m.index - 30), Math.min(code.length, m.index + 120))}`);
    count++;
  }
}
