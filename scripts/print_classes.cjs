const fs = require('fs');
const code = fs.readFileSync('assets/index-D6qIWtA7-p209.js', 'utf8');

console.log('--- Classes definition ---');
console.log(code.substring(1541700, 1546000));
