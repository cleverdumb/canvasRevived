const cvs = document.getElementById('cvs');
const ctx = cvs.getContext('2d');

let sprite = null;

let bw = 20; // px
let bh = 20; // px

let bx = 39; // boxes
let by = 25; // boxes

let invBoxW = 40;
let invBoxH = 60;
let invImgH = 40;
let invStartX = 60;
let invStartY = by*bh + 50;
let invBoxX = 15;
let invSel = I.TOMATOSEED;
let invSelIns = null;

let craftMenuOpen = false;
let craftBoxW = 20;
let craftBoxH = 20;
let craftBoxMargX = 20;
let craftBoxMargY = 20;
let craftBoxX = 12;
let craftBgX = 40;
let craftBgY = 40;
let craftBgW = (craftBoxW + craftBoxMargX) * craftBoxX - craftBoxMargX;
let craftBgH = 400;
let craftBoxBorderWidth = 5;
let craftCurrSel = null;
let craftGapBetweenSec = 30;
let craftSec2X = 40;
let sec1H = 100;
let sec2H = 300;
let craftCurrCount = 1;

const pickable = [B.TOMATO2, B.TOMATO3, B.WHEAT2, B.WHEAT3, B.WHEAT4, B.CARROT2];

let buttons = []; // {x, y, w, h, cb}

cvs.width = bw * bx;
cvs.height = bh * by + 300;
cvs.border = '1px solid black';

function render() {
    ctx.clearRect(0, 0, bw * bx, bh * by + 300);
    let px = chw + fakePl.pos.x; // absolute pos of player, x, relative to 3x3
    let py = chh + fakePl.pos.y; // absolute pos of player, y, relative to 3x3
    let playerColumn = fakeOverMap[fakePl.chunk.y][fakePl.chunk.x][fakePl.pos.y][fakePl.pos.x];
    let roofOnTop = false;
    playerColumn.slice().reverse().forEach((x,i)=>{
        let depth = layers - i;
        if (x !== null && depth > fakePl.z) {
            roofOnTop = true;
        }
    })
    for (let y=0; y<by; y++) {
        for (let x=0; x<bx; x++) {
            let cx = x + (px - 19); // absolute pos, x, relative to 3x3
            let cy = y + (py - 12); // absolute pos, y, relative to 3x3
            let chx = Math.floor(cx/chw); // absolute chunk, x, relative to 3x3 [-1, 0, +1]
            let chy = Math.floor(cy/chh); // absolute chunk, y, relative to 3x3 [-1, 0, +1]
            ctx.strokeRect(x*bw, y*bh, bw, bh);
            if (fakePl.chunk.y-1+chy < 0) continue;
            if (fakePl.chunk.x-1+chx < 0) continue;
            if (fakePl.chunk.x-1+chx > chnx-1) continue;
            if (fakePl.chunk.y-1+chy > chny-1) continue; 
            // let currentTile = null;
            
            // renderTile(x, y, mapData[fakePl.chunk.y-1+chy][fakePl.chunk.x-1+chx][cy%chh][cx%chw]);
            let column = fakeOverMap[fakePl.chunk.y-1+chy][fakePl.chunk.x-1+chx][cy%chh][cx%chw];
            if (roofOnTop) {
                column.slice(0, fakePl.z + 1).forEach((b, i)=>{
                    if (b !== null) {
                        renderTile(x, y, b);
                    }
                })
            }
            else {
                column.forEach((b, i)=>{
                    if (b !== null) {
                        renderTile(x, y, b);
                    }
                })
            }
            
            if (x == 19 && y == 12) {
                if (fakePl.holding === null) {
                    ctx.drawImage(sprite, fakePl.faceLeft ? 0 : 0, fakePl.faceLeft ? 224 : 208, 16, 16, x*bw, y*bh, bw, bh);
                }
                else {
                    ctx.drawImage(sprite, fakePl.faceLeft ? 16 : 16, fakePl.faceLeft ? 224 : 208, 16, 16, x*bw, y*bh, bw, bh);
                    ctx.drawImage(sprite, fakePl.faceLeft ? toolSprPos[parseInt(fakePl.holding.id)][0][0] : toolSprPos[parseInt(fakePl.holding.id)][1][0], fakePl.faceLeft ? toolSprPos[parseInt(fakePl.holding.id)][0][1] : toolSprPos[parseInt(fakePl.holding.id)][1][1], 16, 16, x*bw, y*bh, bw, bh);
                }
            }
            for (q in plData) {
                let p = plData[q];
                // console.log(x);
                if (plId != q && (fakePl.chunk.y-1+chy == p.chunk.y) && (fakePl.chunk.x-1+chx == p.chunk.x) && (cy%chh == p.pos.y) && (cx%chw == p.pos.x)) {
                    if (p.holding === null) {
                        ctx.drawImage(sprite, p.faceLeft ? 0 : 0, p.faceLeft ? 224 : 208, 16, 16, x*bw, y*bh, bw, bh);
                    }
                    else {
                        ctx.drawImage(sprite, p.faceLeft ? 16 : 16, p.faceLeft ? 224 : 208, 16, 16, x*bw, y*bh, bw, bh);
                        ctx.drawImage(sprite, p.faceLeft ? toolSprPos[parseInt(p.holding.id)][0][0] : toolSprPos[parseInt(p.holding.id)][1][0], p.faceLeft ? toolSprPos[parseInt(p.holding.id)][0][1] : toolSprPos[parseInt(p.holding.id)][1][1], 16, 16, x*bw, y*bh, bw, bh);
                    }
                }
            }
            for (let n in npcs) {
                let p = npcs[n];
                if ((fakePl.chunk.y-1+chy == p.chunk.y) && (fakePl.chunk.x-1+chx == p.chunk.x) && (cy%chh == p.pos.y) && (cx%chw == p.pos.x)) {
                    if (p.fourDir) {
                        ctx.drawImage(sprite, p.sprite[p.facing == 'd' ? 0 : (p.facing == 'a' ? 2 : (p.facing == 'w' ? 1 : 3))][0], p.sprite[p.facing == 'd' ? 0 : (p.facing == 'a' ? 2 : (p.facing == 'w' ? 1 : 3))][1], 16, 16, x*bw, y*bh, bw, bh);
                    }
                    else {
                        ctx.drawImage(sprite, p.sprite[p.faceLeft ? 0 : 1][0], p.sprite[p.faceLeft ? 0 : 1][1], 16, 16, x*bw, y*bh, bw, bh);
                    }
                    ctx.fillStyle = 'red';
                    ctx.fillRect(x*bw + 2, y*bh + bh - 3, (bw-4) * p.hp/p.maxHp, 3);
                }
            }
            // console.log(mapData[pl.chunk.y-1+chy][pl.chunk.x-1+chx][cy%chh][cx%chw])
            // ctx.fillStyle = 'black';
            // ctx.fillText(mapData[pl.chunk.y-1+chy][pl.chunk.x-1+chx][cy%chh][cx%chw],x*bw+2, y*bh+10);
        }
    }
    buttons = [];

    ctx.fillStyle = 'black';
    ctx.fillRect(invStartX, by*bh + 30, 300, 15);
    ctx.fillStyle = 'red';
    ctx.fillRect(invStartX, by*bh + 30, 300 * (fakePl.hp/fakePl.maxHp), 15);
    ctx.font = '10px monospace';
    ctx.fillStyle = 'black';
    ctx.fillText(`HP: ${fakePl.hp}/${fakePl.maxHp}`, invStartX, by*bh + 25)

    if (invSel !== null) {
        if ((!fakePl.inv.hasOwnProperty(invSel)) || invSelIns >= fakePl.inv[invSel].instances) {
            invSel = null;
            invSelIns = null;
        }
    }

    let currBoxX = 0;
    let currBoxY = 0;
    for (let x in fakePl.inv) {
        if (typeof fakePl.inv[x] === 'number') {
            if (invSel == x) {
                ctx.fillStyle = '#8E8462';
                ctx.fillRect(currBoxX * invBoxW + invStartX, currBoxY * invBoxH + invStartY, invBoxW, invBoxH);
            }
            ctx.strokeRect(currBoxX * invBoxW + invStartX, currBoxY * invBoxH + invStartY, invBoxW, invBoxH);
            buttons.push({
                x: currBoxX * invBoxW + invStartX,
                y: currBoxY * invBoxH + invStartY,
                w: invBoxW,
                h: invBoxH,
                cb: ()=>{
                    if (invSel !== x) {
                        invSel = x;
                    }
                    else {
                        invSel = null;
                    }
                    render();
                }
            })
            ctx.drawImage(sprite, iSprPos[x][0], iSprPos[x][1], 16, 16, currBoxX * invBoxW + invStartX, currBoxY * invBoxH + invStartY, invBoxW, invImgH);
            ctx.font = '20px monospace';
            ctx.fillStyle = 'black';
            ctx.fillText(fakePl.inv[x], currBoxX * invBoxW + invStartX+5, currBoxY * invImgH + invStartY + invImgH + 15);
            currBoxX++;
            if (currBoxX >= invBoxX) {
                currBoxY++;
                currBoxX = 0;
            }
        }
        else {
            for (let i=0; i<fakePl.inv[x].instances; i++) {
                if (invSel == x && invSelIns == i) {
                    ctx.fillStyle = '#8E8462';
                    ctx.fillRect(currBoxX * invBoxW + invStartX, currBoxY * invBoxH + invStartY, invBoxW, invBoxH);
                }
                ctx.strokeRect(currBoxX * invBoxW + invStartX, currBoxY * invBoxH + invStartY, invBoxW, invBoxH);
                buttons.push({
                    x: currBoxX * invBoxW + invStartX,
                    y: currBoxY * invBoxH + invStartY,
                    w: invBoxW,
                    h: invBoxH,
                    cb: ()=>{
                        if (invSel !== x || invSelIns !== i) {
                            invSel = x;
                            invSelIns = i;
                        }
                        else {
                            invSel = null;
                            invSelIns = null;
                        }
                        render();
                    }
                })
                ctx.drawImage(sprite, iSprPos[x][0], iSprPos[x][1], 16, 16, currBoxX * invBoxW + invStartX, currBoxY * invBoxH + invStartY, invBoxW, invImgH);
                ctx.font = '20px monospace';
                ctx.fillStyle = 'red';
                ctx.fillRect(currBoxX * invBoxW + invStartX, currBoxY * invBoxH + invStartY + invImgH, invBoxW, 5);
                ctx.fillStyle = 'green';
                ctx.fillRect(currBoxX * invBoxW + invStartX, currBoxY * invBoxH + invStartY + invImgH, invBoxW * (fakePl.inv[x].duras[i]/10), 5);
                if (fakePl.holding !== null && fakePl.holding.id == x && fakePl.holding.ins == i) {
                    ctx.fillStyle = 'black';
                    ctx.font = '10px monospace'
                    ctx.fillText('E', currBoxX * invBoxW + invStartX + 5, currBoxY * invBoxH + invStartY + invImgH + 5 + 10)
                }
                currBoxX++;
                if (currBoxX >= invBoxX) {
                    currBoxY++;
                    currBoxX = 0;
                }
            }
        }
    }

    if (craftMenuOpen) {
        let R = {...baseRecipes};
        if (overMap[fakePl.chunk.y][fakePl.chunk.x][fakePl.pos.y][fakePl.pos.x][fakePl.z] == B.SMELTER) {
            R = {...R, ...smelterRecipes};
        }
        let currX = craftBgX;
        let currY = craftBgY;
        ctx.fillStyle = '#685232';
        ctx.fillRect(currX-10, currY-10, craftBgW+20, craftBgH+20);
        let i = 0;
        for (let r in R) {
            i++;
            ctx.fillStyle = '#CEBF8B';
            ctx.fillRect(currX - craftBoxBorderWidth, currY - craftBoxBorderWidth, craftBoxW + 2 * craftBoxBorderWidth, craftBoxH + 2 * craftBoxBorderWidth);
            ctx.drawImage(sprite, iSprPos[I[r]][0], iSprPos[I[r]][1], 16, 16, currX, currY, craftBoxW, craftBoxH);
            buttons.push({
                x: currX - craftBoxBorderWidth,
                y: currY - craftBoxBorderWidth,
                w: craftBoxW + 2 * craftBoxBorderWidth,
                h: craftBoxH + 2 * craftBoxBorderWidth,
                cb: function () {
                    craftCurrSel = r;
                    craftCurrCount = 1;
                    // console.log(r);
                    render();
                }
            })
            currX += craftBoxW + craftBoxMargX;
            if (currX >= craftBgW + craftBgX) {
                currX = craftBgX;
                currY += craftBoxH + craftBoxMargY;
            }
        }

        if (craftCurrSel !== null && !R.hasOwnProperty(craftCurrSel)) {
            craftCurrSel = null;
        }

        if (craftCurrSel !== null) {
            currX = craftSec2X;
            currY += sec1H + craftGapBetweenSec;
            ctx.strokeStyle = 'white';
            ctx.strokeRect(currX, currY, 32, 47);
            ctx.drawImage(sprite, iSprPos[I[craftCurrSel]][0], iSprPos[I[craftCurrSel]][1], 16, 16, currX, currY, 32, 32);
            ctx.drawImage(sprite, 0, 160, 16, 16, currX + 50, currY, 32, 32);
            ctx.drawImage(sprite, 16, 160, 16, 16, currX + 50, currY, 32, 32);
            ctx.drawImage(sprite, 16, 160, 16, 16, currX + 100, currY, 32, 32);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(currX + 50, currY, 32, 32);
            ctx.strokeRect(currX + 100, currY, 32, 32);
            buttons.push({
                x: currX + 50,
                y: currY,
                w: 32, 
                h: 32,
                cb: ()=>{
                    craftCurrCount++;
                    render();
                }
            })
            buttons.push({
                x: currX + 100,
                y: currY,
                w: 32, 
                h: 32,
                cb: ()=>{
                    craftCurrCount--;
                    craftCurrCount = Math.max(1, craftCurrCount);
                    render();
                }
            })
            ctx.font = '15px monospace';
            ctx.fillText('CRAFT', currX + 150 + 10, currY+18);
            ctx.strokeRect(currX + 150, currY, ctx.measureText('CRAFT').width + 20, 15 + 10);
            buttons.push({
                x: currX + 150,
                y: currY,
                w: ctx.measureText('CRAFT').width + 20,
                h: 15 + 10,
                cb: () => {
                    let possible = true;
                    for (let part in R[craftCurrSel]) {
                        if ((!fakePl.inv.hasOwnProperty(I[part])) || (fakePl.inv[I[part]] < R[craftCurrSel][part] * craftCurrCount)) {
                            possible = false;
                        }
                    }
                    if (possible) {
                        craft(craftCurrSel, craftCurrCount);
                    }
                }
            })

            currY += 32;

            ctx.font = '12px monospace';
            ctx.fillStyle = 'white';
            ctx.fillText(craftCurrCount, currX + 15 - ctx.measureText(craftCurrCount).width/2, currY + 12);

            currY += 27;

            ctx.font = '15px monospace'
            ctx.fillText('COST: ',currX, currY+7.5);

            currY += 15 + 5;
    
            ctx.font = '15px monospace';
            for (x in R[craftCurrSel]) {
                ctx.fillStyle = ((fakePl.inv[I[x]] || 0) >= (R[craftCurrSel][x] * craftCurrCount)) ? '#44AF69' : '#E8090A'; 
                ctx.drawImage(sprite, iSprPos[I[x]][0], iSprPos[I[x]][1], 16, 16, currX, currY, 15, 15);
                ctx.fillText(`${fakePl.inv[I[x]] || 0}/${R[craftCurrSel][x] * craftCurrCount}`, currX + 15 + 5, currY + 12);
                currY += 15 + 5;
            }
        }
    }

    if (placeable.some(x=>I[x] == parseInt(invSel)) || usable.includes(parseInt(invSel))) {
        ctx.strokeStyle = 'black';
        ctx.fillStyle = '#685232';
        ctx.fillRect(invStartX + 20, invStartY - 103, ctx.measureText('USE').width + 20, 26);
        ctx.strokeRect(invStartX + 20, invStartY - 103, ctx.measureText('USE').width + 20, 26);
        ctx.font = '20px monospace';
        ctx.fillStyle = 'white';
        ctx.fillText('USE', invStartX + 20 + 10, invStartY - 100 + 18);
        buttons.push({
            x: invStartX + 20,
            y: invStartY - 103,
            w: ctx.measureText('USE').width + 20,
            h: 26,
            cb: ()=>{
                use(parseInt(invSel));
            }
        })
    }

    if (pickable.includes(fakeOverMap[fakePl.chunk.y][fakePl.chunk.x][fakePl.pos.y][fakePl.pos.x][fakePl.z])) {
        ctx.strokeStyle = 'black';
        ctx.fillStyle = '#685232';
        ctx.fillRect(invStartX + 20 + 200, invStartY - 103, ctx.measureText('PICK').width + 20, 26);
        ctx.strokeRect(invStartX + 20 + 200, invStartY - 103, ctx.measureText('PICK').width + 20, 26);
        ctx.font = '20px monospace';
        ctx.fillStyle = 'white';
        ctx.fillText('PICK', invStartX + 20 + 10 + 200, invStartY - 100 + 18);
        buttons.push({
            x: invStartX + 20 + 200,
            y: invStartY - 103,
            w: ctx.measureText('PICK').width + 20,
            h: 26,
            cb: ()=>{
                let cmdId = nextCmdId++;
                let seed = Math.round(Math.random()*1e5);
                unauthCmd[cmdId] = 'inH';
                randomSeeds[cmdId] = seed;
                socket.emit('interact', session, 'h', cmdId, seed);
                // interact(fakeOverMap[fakePl.chunk.y][fakePl.chunk.x][fakePl.pos.y][fakePl.pos.x][fakePl.z], fakePl.chunk, fakePl.pos);
                
            }
        })
    }
}

function renderTile(x, y, type) {
    ctx.drawImage(sprite, sprPos[type][0], sprPos[type][1], 16, 16, x*bw, y*bh, bw, bh);
}

function loadSpriteMap(cb) {
    // let sprite = null;
    let i = new Image();
    i.src = './sprites.png';
    i.onload = ()=>{
        createImageBitmap(i).then(x=>{
            sprite = x;
            // signup('n1', 'p1', ()=>{
            //     (cb)();
            // });
            // start();
            // login('n1','p1',afterSpriteLoaded);
        });
    }
}