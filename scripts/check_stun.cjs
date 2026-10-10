const fs = require('fs');
const code = fs.readFileSync('assets/index-D6qIWtA7-p209.js', 'utf8');

// Find where stun is implemented
const regexes = [/applyStun/gi, /stun\b/gi, /isStunned/gi, /execAoeStatus/gi];
for (const re of regexes) {
  let m;
  let count = 0;
  while ((m = re.exec(code)) !== null && count < 5) {
    console.log(`[${re}] [${m.index}] ${code.substring(Math.max(0, m.index - 30), Math.min(code.length, m.index + 120))}`);
    count++;
  }
}
