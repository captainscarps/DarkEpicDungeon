const fs = require('fs');

const files = [
  'assets/index-D6qIWtA7-p209.js',
  'Projeto atualizado/assets/index-D6qIWtA7-p209.js'
];

for (const f of files) {
  if (!fs.existsSync(f)) {
    console.log('Skipping non-existent:', f);
    continue;
  }
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;

  // 1. Update d calculation to check armor, helmet, boots
  const targetArmor = 'const d=Xi(t.armor);if(this.mk2)';
  const replArmor = 'const d=Math.max(Xi(t.armor),Xi(t.helmet),Xi(t.boots));if(this.mk2)';
  if (content.includes(targetArmor)) {
    content = content.replace(targetArmor, replArmor);
    changed = true;
    console.log(`[${f}] Replaced d calculation`);
  } else {
    console.log(`[${f}] Target armor calculation not found or already replaced`);
  }

  // 2. Add shaman to El if not present
  const targetEl = 'const El=["warrior","paladin","berserker","rogue","shadow_assassin","archer","hunter","mage","necromancer","warlock"]';
  const replEl = 'const El=["warrior","paladin","berserker","rogue","shadow_assassin","archer","hunter","mage","necromancer","warlock","shaman"]';
  if (content.includes(targetEl)) {
    content = content.replace(targetEl, replEl);
    changed = true;
    console.log(`[${f}] Added shaman to El`);
  } else {
    console.log(`[${f}] Target El array not found or already replaced`);
  }

  if (changed) {
    fs.writeFileSync(f, content, 'utf8');
    console.log(`[${f}] Saved changes successfully.`);
  }
}
