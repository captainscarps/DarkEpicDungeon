const fs = require('fs');
const code = fs.readFileSync('assets/index-D6qIWtA7-p209.js', 'utf8');

console.log('--- Search 1: id:"berserker" or id:"warrior" ---');
let re = /id\s*:\s*["'](?:berserker|warrior)["']/g;
let m;
while ((m = re.exec(code)) !== null) {
  console.log('Pos ' + m.index + ': ' + code.substring(Math.max(0, m.index - 80), m.index + 200));
}

console.log('\n--- Search 2: class list / definitions ---');
re = /CLASSES\s*=|HEROES\s*=|pe\s*=\s*\{/g;
while ((m = re.exec(code)) !== null) {
  console.log('Pos ' + m.index + ': ' + code.substring(m.index, m.index + 200));
}

console.log('\n--- Search 3: berserker skills ---');
re = /berserker/gi;
const berserkerSnippets = [];
while ((m = re.exec(code)) !== null) {
  const snip = code.substring(Math.max(0, m.index - 40), Math.min(code.length, m.index + 120));
  if (snip.includes('skill') || snip.includes('Skill') || snip.includes('name') || snip.includes('desc') || snip.includes('icon')) {
    berserkerSnippets.push({ pos: m.index, text: snip });
  }
}
console.log('Found ' + berserkerSnippets.length + ' skill-related berserker occurrences:');
berserkerSnippets.slice(0, 10).forEach(s => console.log(`[${s.pos}] ${s.text}`));
