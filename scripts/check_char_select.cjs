const fs = require('fs');
const code = fs.readFileSync('assets/index-D6qIWtA7-p209.js', 'utf8');

const pos = code.indexOf('refreshDetails(){');
console.log('--- Character Select details ---');
console.log(code.substring(pos, pos + 2500));
