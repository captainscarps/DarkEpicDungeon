const fs = require('fs');
const code = fs.readFileSync('assets/index-D6qIWtA7-p209.js', 'utf8');

const pos = code.indexOf('case"shapeshift":');
console.log('--- Ability execution switch ---');
console.log(code.substring(pos - 300, pos + 1200));
