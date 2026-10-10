const fs = require('fs');
const c = fs.readFileSync('assets/index-D6qIWtA7-p209.js', 'utf8');
let q = 0;
while ((q = c.indexOf('BERSERKER', q)) !== -1) {
  const s = c.substring(q - 90, q + 90).replace(/\s+/g, ' ');
  if (!/classRequirement|weaponCategory/.test(s)) console.log('@' + q + ': ' + s);
  q += 9;
}
console.log('\n---- fury ----');
q = 0; let n = 0;
while ((q = c.indexOf('"fury"', q)) !== -1 && n < 12) { console.log('@' + q + ': ' + c.substring(q - 120, q + 120).replace(/\s+/g, ' ')); q += 6; n++; }
console.log('\n---- ClassSelect items ----');
q = c.indexOf('super("ClassSelect")');
const body = c.substring(q, q + 9000);
const k = body.indexOf('this.items');
console.log(body.substring(Math.max(0, k - 1500), k + 900));
