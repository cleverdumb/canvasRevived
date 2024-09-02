const chw = 50;  // CHunk Width
const chh = 25;  // CHunk Height
const chnx = 16; // CHunk Number X
const chny = 24; // CHunk Number Y

let session = null;
let mapData = [];
for (let y=0; y<chny; y++) {
    mapData.push([]);
    for (let x=0; x<chnx; x++) {
        mapData[y].push([]);
        for (let a=0; a<chh; a++) {
            mapData[y][x].push([]);
            for (let b=0; b<chw; b++) {
                mapData[y][x][a].push((Math.random()>0.5)%2?0:1);
            }
        }
    }
}

// for (let y=0; y<chny; y++) {
//     mapData.push([]);
//     for (let x=0; x<chnx; x++) {
//         mapData[y].push(null);
//     }
// }

let fakePl = {};
let plData = {}; // players data locally (actual, authorised)
let plId = null;

function signup(user, pass, cb) {
    let request = new XMLHttpRequest();
    let path = window.location.href + 'signup';
    request.open('POST', path, true);
    request.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
    request.onreadystatechange = ()=>{
        if (request.readyState == XMLHttpRequest.DONE) {
            let res = request.responseText;
            if (res == '0') {
                console.log('%cSuccess', 'color: green');
                login('n1', 'p1', cb);
            }
            else if (res == '1') {
                console.log('%cUsername used', 'color: red');
                login('n1', 'p1', cb);
            }
            else if (res == '2') {
                console.log('%cInvalid data', 'color: red')
            }
        }
    }
    let text = JSON.stringify({user, pass});
    request.send(text);
}

function login(user, pass, cb) {
    let request = new XMLHttpRequest();
    let path = window.location.href + 'login';
    request.open('POST', path, true);
    request.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
    request.onreadystatechange = ()=>{
        if (request.readyState == XMLHttpRequest.DONE) {
            if (request.responseText == '0') {
                console.log('%cIncorrect user or pass', 'color: red');
            }
            else if (request.responseText == '1') {
                console.log('%cInvalid data', 'color: red')
            }
            else {
                let resp = request.responseText;
                session = resp.split('-')[0];
                let pl = JSON.parse(resp.split('-')[1]);
                plId = pl.id;
                plData[pl.id] = {chunk:pl.chunk, pos:pl.pos};
                fakePl = JSON.parse(JSON.stringify({chunk: pl.chunk, pos: pl.pos}));
                let resMapData = JSON.parse(resp.split('-')[2]);
                let resAllPlData = JSON.parse(resp.split('-')[3]);
                resAllPlData.forEach(x=>{
                    delete plData[x.id];
                    plData[x.id] = {chunk: x.chunk, pos: x.pos};
                })
                resMapData.forEach((x, i)=>{
                    if (!x) return;
                    mapData[pl.chunk.y - 1 + Math.floor(i/3)][pl.chunk.x - 1 + i%3] = x;
                })
                console.log(`%cSuccess. Session: ${session}`, 'color: green');
                // console.log(mapData);

                (cb)();
            }
        }
    }
    let text = JSON.stringify({user, pass});
    request.send(text);
}

function logout() {
    let request = new XMLHttpRequest();
    let path = window.location.href + 'logout';
    request.open('POST', path, true);
    request.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
    request.onreadystatechange = ()=>{
        if (request.readyState == XMLHttpRequest.DONE) {
            console.log(`%cSuccess`, 'color: green');
        }
    }
    request.send(JSON.stringify({session}));
}