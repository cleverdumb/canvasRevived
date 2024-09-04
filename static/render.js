const cvs = document.getElementById('cvs');
const ctx = cvs.getContext('2d');

let sprite = null;

let bw = 20; // px
let bh = 20; // px

let bx = 39; // boxes
let by = 25; // boxes

let invBoxW = 40;
let invBoxH = 55;
let invImgH = 40;
let invStartX = 60;
let invStartY = by*bh + 30;
let invBoxX = 15;

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
    console.log(roofOnTop);
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
                column.slice(0, fakePl.z + 1).forEach(b=>{
                    if (b !== null) {
                        renderTile(x, y, b);
                    }
                })
            }
            else {
                column.forEach(b=>{
                    if (b !== null) {
                        renderTile(x, y, b);
                    }
                })
            }
            
            if (x == 19 && y == 12) {
                // ctx.fillStyle = 'cyan';
                ctx.drawImage(sprite, 0, 208, 16, 16, x*bw, y*bh, bw, bh);
            }
            for (q in plData) {
                let p = plData[q];
                // console.log(x);
                if (plId != q && (plData[plId].chunk.y-1+chy == p.chunk.y) && (plData[plId].chunk.x-1+chx == p.chunk.x) && (cy%chh == p.pos.y) && (cx%chw == p.pos.x)) {
                    ctx.drawImage(sprite, 0, 208, 16, 16, x*bw, y*bh, bw, bh);
                }
            }
            // console.log(mapData[pl.chunk.y-1+chy][pl.chunk.x-1+chx][cy%chh][cx%chw])
            // ctx.fillStyle = 'black';
            // ctx.fillText(mapData[pl.chunk.y-1+chy][pl.chunk.x-1+chx][cy%chh][cx%chw],x*bw+2, y*bh+10);
        }
    }
    let currBoxX = 0;
    let currBoxY = 0;
    for (x in fakePl.inv) {
        ctx.strokeRect(currBoxX * invBoxW + invStartX, currBoxY * invBoxH + invStartY, invBoxW, invBoxH);
        if (x == I.WOOD) {
            ctx.drawImage(sprite, 96, 0, 16, 16, currBoxX * invBoxW + invStartX, currBoxY * invBoxH + invStartY, invBoxW, invImgH);
        }
        ctx.font = '20px monospace';
        ctx.fillText(fakePl.inv[x], currBoxX * invBoxW + invStartX+5, currBoxY * invImgH + invStartY + invImgH + 10);
        currBoxX++;
        if (currBoxX >= invBoxX) {
            currBoxY++;
            currBoxX = 0;
        }
    }
}

function renderTile(x, y, type) {
    switch (type) {
        case B.GRASS:
            ctx.drawImage(sprite, 0, 0, 16, 16, x*bw, y*bh, bw, bh);
            break;
        case B.WATER:
            ctx.drawImage(sprite, 0, 64, 16, 16, x*bw, y*bh, bw, bh);
            break;
        case B.TREE:
            ctx.drawImage(sprite, 16, 0, 16, 16, x*bw, y*bh, bw, bh);
            break;
        case B.TREE1:
            ctx.drawImage(sprite, 32, 0, 16, 16, x*bw, y*bh, bw, bh);
            break;
        case B.TREE2:
            ctx.drawImage(sprite, 48, 0, 16, 16, x*bw, y*bh, bw, bh);
            break;
        case B.TREE3:
            ctx.drawImage(sprite, 64, 0, 16, 16, x*bw, y*bh, bw, bh);
            break;
        case B.STUMP:
            ctx.drawImage(sprite, 80, 0, 16, 16, x*bw, y*bh, bw, bh);
            break;
        case B.SAND:
            ctx.drawImage(sprite, 16, 64, 16, 16, x*bw, y*bh, bw, bh);
    }
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