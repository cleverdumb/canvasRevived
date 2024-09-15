const fs = require('fs');

let ori = fs.readFileSync('./static/blockIds.js', 'utf-8');
ori += `
module.exports = {
    B, I, baseRecipes, axe, pickaxe, unstack, requireAxe, requirePickaxe, toolCd, sword, dmg, interactable, passable, smelterRecipes
};
`
fs.writeFileSync('./blockIds.js', ori);