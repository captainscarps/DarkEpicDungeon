const fs = require('fs');
const code = fs.readFileSync('assets/index-D6qIWtA7-p209.js', 'utf8');

const pos = code.indexOf('IAIJUTSU:{id:"IAIJUTSU"');
console.log('--- Ability definitions around IAIJUTSU ---');
console.log(code.substring(pos, pos + 3000));
