function simulateCmd(name, cmdId) {
    switch (name) {
        case 'mvD':
            fakePl.pos.x++;
            if (fakePl.pos.x >= chw) {
                fakePl.pos.x = 0;
                if (fakePl.chunk.x >= 1){
                    if (fakePl.chunk.y >= 1) {
                        fakeOverMap[fakePl.chunk.y-1][fakePl.chunk.x-1] = null;
                    }
                    fakeOverMap[fakePl.chunk.y][fakePl.chunk.x-1] = null;
                    if (fakePl.chunk.y < chny-1) {
                        fakeOverMap[fakePl.chunk.y+1][fakePl.chunk.x-1] = null;
                    }
                }
                fakePl.chunk.x++;
            }
            destZ = fakePl.z;
            destColumn = fakeOverMap[fakePl.chunk.y][fakePl.chunk.x][fakePl.pos.y][fakePl.pos.x].slice(0, fakePl.z).toReversed();
            // destColumn.reverse();
            for (let i=0; i<destColumn.length; i++) {
                if (destColumn[i] !== null && (((!passable.includes(destColumn[i]))) || nonFallThrough.includes(destColumn[i]))) {
                    destZ -= i;
                    break;
                }
            }
            fakePl.faceLeft = false;
            fakePl.facing = 'd';
            fakePl.z = destZ;
            render();
            break;
        case 'mvA':
            fakePl.pos.x--;
            if (fakePl.pos.x < 0) {
                if (fakePl.chunk.x < chnx - 1){
                    if (fakePl.chunk.y >= 1) {
                        fakeOverMap[fakePl.chunk.y-1][fakePl.chunk.x+1] = null;
                    }
                    fakeOverMap[fakePl.chunk.y][fakePl.chunk.x+1] = null;
                    if (fakePl.chunk.y < chny-1) {
                        fakeOverMap[fakePl.chunk.y+1][fakePl.chunk.x+1] = null;
                    }
                }
                fakePl.pos.x = chw-1;
                fakePl.chunk.x--;
            }
            destZ = fakePl.z;
            destColumn = fakeOverMap[fakePl.chunk.y][fakePl.chunk.x][fakePl.pos.y][fakePl.pos.x].slice(0, fakePl.z).toReversed();
            
            for (let i=0; i<destColumn.length; i++) {
                if (destColumn[i] !== null && ((!passable.includes(destColumn[i])) || nonFallThrough.includes(destColumn[i]))) {
                    destZ -= i;
                    break;
                }
            }
            fakePl.z = destZ;
            fakePl.faceLeft = true;
            fakePl.facing = 'a';
            render();
            break;
        case 'mvS':
            fakePl.pos.y++;
            if (fakePl.pos.y >= chh) {
                fakePl.pos.y = 0;
                if (fakePl.chunk.y >= 1){
                    if (fakePl.chunk.x >= 1) {
                        fakeOverMap[fakePl.chunk.y-1][fakePl.chunk.x-1] = null;
                    }
                    fakeOverMap[fakePl.chunk.y-1][fakePl.chunk.x] = null;
                    if (fakePl.chunk.x < chnx-1) {
                        fakeOverMap[fakePl.chunk.y-1][fakePl.chunk.x+1] = null;
                    }
                }
                fakePl.chunk.y++;
            }
            destZ = fakePl.z;
            destColumn = fakeOverMap[fakePl.chunk.y][fakePl.chunk.x][fakePl.pos.y][fakePl.pos.x].slice(0, fakePl.z).toReversed();
            for (let i=0; i<destColumn.length; i++) {
                if (destColumn[i] !== null && ((!passable.includes(destColumn[i])) || nonFallThrough.includes(destColumn[i]))) {
                    destZ -= i;
                    break;
                }
            }
            fakePl.z = destZ;
            fakePl.facing = 's';
            render();
            break;
        case 'mvW':
            fakePl.pos.y--;
            if (fakePl.pos.y < 0) {
                if (fakePl.chunk.y < chny - 1){
                    if (fakePl.chunk.x >= 1) {
                        fakeOverMap[fakePl.chunk.y+1][fakePl.chunk.x-1] = null;
                    }
                    fakeOverMap[fakePl.chunk.y+1][fakePl.chunk.x] = null;
                    if (fakePl.chunk.x < chnx-1) {
                        fakeOverMap[fakePl.chunk.y+1][fakePl.chunk.x+1] = null;
                    }
                }
                fakePl.pos.y = chh-1;
                fakePl.chunk.y--;
            }
            destZ = fakePl.z;
            destColumn = fakeOverMap[fakePl.chunk.y][fakePl.chunk.x][fakePl.pos.y][fakePl.pos.x].slice(0, fakePl.z).toReversed();
            for (let i=0; i<destColumn.length; i++) {
                if (destColumn[i] !== null && ((!passable.includes(destColumn[i])) || nonFallThrough.includes(destColumn[i]))) {
                    destZ -= i;
                    break;
                }
            }
            fakePl.z = destZ;
            fakePl.facing = 'w';
            render();
            break;
        case 'inD':
        case 'inA': {
            let xMult = name[2] == 'D' ? 1 : -1;
            let destChunk = {
                x: (fakePl.chunk.x + Math.floor((fakePl.pos.x + xMult)/chw)),
                y: fakePl.chunk.y
            }
            let destPos = {
                x: (fakePl.pos.x + xMult + chw)%chw,
                y: fakePl.pos.y,
                z: fakePl.z
            }
            interact(fakeOverMap[destChunk.y][destChunk.x][destPos.y][destPos.x][destPos.z], destChunk, destPos, randomSeeds[cmdId]);
            fakePl.faceLeft = (name == 'inA');
            fakePl.facing = name[2].toLowerCase();
            break;
        }
        case 'inS':
        case 'inW': {
            let yMult = name[2] == 'S' ? 1 : -1;
            let destChunk = {
                x: fakePl.chunk.x,
                y: (fakePl.chunk.y + Math.floor((fakePl.pos.y + yMult)/chh))
            }
            let destPos = {
                x: fakePl.pos.x,
                y: (fakePl.pos.y + yMult + chh)%chh,
                z: fakePl.z
            }
            interact(fakeOverMap[destChunk.y][destChunk.x][destPos.y][destPos.x][destPos.z], destChunk, destPos, randomSeeds[cmdId]);
            fakePl.facing = name[2].toLowerCase();
            break;
        }
        case 'inH': {
            interact(fakeOverMap[fakePl.chunk.y][fakePl.chunk.x][fakePl.pos.y][fakePl.pos.x][fakePl.z], fakePl.chunk, {x: fakePl.pos.x, y: fakePl.pos.y, z: fakePl.z}, randomSeeds[cmdId]);
            break;
        }
        case 'shoot':
            fakePl.inv[I.BOW].duras[fakePl.holding.ins]--;
            if (randomSeeds[cmdId] % 20 === 0) {
                removeFromInv(fakePl.ammo, null);
                if (!fakePl.inv.hasOwnProperty(fakePl.ammo)) {
                    fakePl.ammo = null;
                }
            }
            break;
        default:
            if (name.startsWith('pl')) {
                let blockId = parseInt(name.substr(2));
                fakeOverMap[fakePl.chunk.y][fakePl.chunk.x][fakePl.pos.y][fakePl.pos.x][fakePl.z] = blockId;
                fakePl.z++;
                while (fakeOverMap[fakePl.chunk.y][fakePl.chunk.x][fakePl.pos.y][fakePl.pos.x][fakePl.z] !== null && fakePl.z < 5) {
                    fakePl.z++;
                }
            }
            else if (name.startsWith('cr')) {
                let R = {...baseRecipes};
                if (overMap[fakePl.chunk.y][fakePl.chunk.x][fakePl.pos.y][fakePl.pos.x][fakePl.z] == B.SMELTER) {
                    R = {...R, ...smelterRecipes};
                }
                let arg = name.substr(2);
                let type = arg.split('-')[0];
                let amount = parseInt(arg.split('-')[1]);
                for (let part in R[type]) {
                    fakePl.inv[I[part]] -= R[type][part] * amount;
                    if (fakePl.inv[I[part]] <= 0) {
                        delete fakePl.inv[I[part]];
                    }
                }
                for (let x=0; x<amount; x++) {
                    addToInventory(I[type]);
                }
            }
            else if (name.startsWith('ho')) {
                let id = name.substr(2).split('-')[0];
                let ins = name.substr(2).split('-')[1];
                
                if (sword.includes(parseInt(id)) || pickaxe.includes(parseInt(id)) || axe.includes(parseInt(id)) || parseInt(id) == I.BOW) {
                    fakePl.holding = {id: id, ins: ins};
                }
                else if (armor.includes(parseInt(id))) {
                    fakePl.armor = {id: id, ins: ins};
                }
                else if (helm.includes(parseInt(id))) {
                    fakePl.helm = {id: id, ins: ins};
                }
            }
            else if (name.startsWith('unho')) {
                let id = name.substr(4).split('-')[0];

                if (sword.includes(parseInt(id)) || pickaxe.includes(parseInt(id)) || axe.includes(parseInt(id)) || parseInt(id) == I.BOW) {
                    fakePl.holding = null;
                }
                else if (armor.includes(parseInt(id))) {
                    fakePl.armor = null;
                }
                else if (helm.includes(parseInt(id))) {
                    fakePl.helm = null;
                }
            }
            else if (name.startsWith('use')) {
                let id = name.substr(3);

                if (useEffect(parseInt(id))) {
                    removeFromInv(parseInt(id), null);
                }
            }
            else if (name.startsWith('rot')) {
                fakePl.facing = name[3].toLowerCase();
                if (name[3] == 'D') {
                    fakePl.faceLeft = false;
                }
                else if (name[3] == 'A') {
                    fakePl.faceLeft = true;
                }
            }
            else if (name.startsWith('ammo')) {
                if (fakePl.ammo == parseInt(name.substr(4))) {
                    fakePl.ammo = null;
                }
                else {
                    fakePl.ammo = parseInt(name.substr(4));
                }
            }
        break;
    }
}