const fs = require('fs');
const code = fs.readFileSync('assets/index-D6qIWtA7-p209.js', 'utf8');

const funcs = ['execMeleeHeavy', 'execAoeSelf', 'execBuff', 'execAoeStatus', 'execTelegraphAoe'];
funcs.forEach(f => {
  const p = code.indexOf(f + '(');
  if (p !== -1) {
    console.log(`=== ${f} ===`);
    console.log(code.substring(p, p + 600));
  }
});
