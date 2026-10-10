const fs = require('fs');
const code = fs.readFileSync('assets/index-D6qIWtA7-p209.js', 'utf8');

const pos = code.indexOf('fe=[');
if (pos !== -1) {
  console.log('fe=[');
  console.log(code.substring(pos, pos + 500));
} else {
  const p2 = code.indexOf('__HN=');
  if (p2 !== -1) {
    console.log('__HN=');
    console.log(code.substring(p2 - 100, p2 + 500));
  } else {
    console.log('Searching fe and __HN occurrences');
    const p3 = code.indexOf('fe=');
    console.log(code.substring(p3 - 50, p3 + 300));
  }
}

const posCol = code.indexOf('__clsCol=');
if (posCol !== -1) {
  console.log('__clsCol:');
  console.log(code.substring(posCol - 50, posCol + 400));
}
