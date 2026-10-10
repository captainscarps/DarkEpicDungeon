const fs = require('fs');
const code = fs.readFileSync('assets/index-D6qIWtA7-p209.js', 'utf8');
const show = (label, idx, before = 150, after = 350) => console.log(`\n=== ${label} @${idx} ===\n` + code.substring(idx - before, idx + after));
show('procedural tex', 1461324, 400, 120);
show('vi', 1891421, 250, 60);
show('glow', 1899710, 350, 250);
show('motion', 2055446, 300, 300);
show('short/lr/vh', 2063195, 250, 450);
show('starter weapon', 2064564, 250, 60);
show('Ps', 2114053, 1100, 300);
show('intro', 2354065, 700, 120);
show('orb', 1743228, 30, 400);
['"tag.SHAMAN"', '"desc.SHAMAN"', 'statusFx', 'STUN:', 'stun:{', '"stun"', 'ccImmune', 'slowTimer', 'stunTimer'].forEach(k => {
  let p = 0, n = 0;
  while ((p = code.indexOf(k, p)) !== -1 && n < 4) { console.log(`\n[${k}] @${p}: ` + code.substring(p - 80, p + 220)); p += k.length; n++; }
});
