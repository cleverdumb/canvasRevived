const fs = require('fs');

let ori = fs.readFileSync('./static/blockIds.js', 'utf-8');
ori += `
module.exports = {
    B, I, R, axe, pickaxe, unstack, requireAxe, requirePickaxe, toolCd
};
`
fs.writeFileSync('./blockIds.js', ori);