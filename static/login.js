const chw = 50;  // CHunk Width
const chh = 25;  // CHunk Height
const chnx = 16; // CHunk Number X
const chny = 24; // CHunk Number Y
const layers = 5;

let session = null;
// let mapData = [];
// for (let y=0; y<chny; y++) {
//     mapData.push([]);
//     for (let x=0; x<chnx; x++) {
//         mapData[y].push([]);
//         for (let a=0; a<chh; a++) {
//             mapData[y][x].push([]);
//             for (let b=0; b<chw; b++) {
//                 mapData[y][x][a].push(B.GRASS);
//             }
//         }
//     }
// }

let overMap = [];
for (let y=0; y<chny; y++) {
    overMap.push([]);
    for (let x=0; x<chnx; x++) {
        overMap[y].push([]);
        for (let a=0; a<chh; a++) {
            overMap[y][x].push([]);
            for (let b=0; b<chw; b++) {
                overMap[y][x][a].push([]);
                for (let z=0; z<layers; z++) {
                    overMap[y][x][a][b].push(null);
                }
            }
        }
    }
}

let fakeOverMap = [];
for (let y=0; y<chny; y++) {
    fakeOverMap.push([]);
    for (let x=0; x<chnx; x++) {
        fakeOverMap[y].push([]);
        for (let a=0; a<chh; a++) {
            fakeOverMap[y][x].push([]);
            for (let b=0; b<chw; b++) {
                fakeOverMap[y][x][a].push([]);
                for (let z=0; z<layers; z++) {
                    fakeOverMap[y][x][a][b].push(null);
                }
            }
        }
    }
}

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
                document.getElementById('feedback').innerText = 'Successful signup';
            }
            else if (res == '1') {
                console.log('%cUsername used', 'color: red');
                document.getElementById('feedback').innerText = 'Username used';
            }
            else if (res == '2') {
                console.log('%cInvalid data', 'color: red');
                document.getElementById('feedback').innerText = 'Invalid data';
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
                document.getElementById('feedback').innerText = 'Incorrect';
            }
            else if (request.responseText == '1') {
                console.log('%cInvalid data', 'color: red')
                document.getElementById('feedback').innerText = 'Invalid data';
            }
            else {
                document.getElementById('user').style.display = 'none';
                document.getElementById('pass').style.display = 'none';
                document.getElementById('loginBtn').style.display = 'none';
                document.getElementById('signupBtn').style.display = 'none';
                document.getElementById('feedback').style.display = 'none';

                let resp = request.responseText;
                session = resp.split('-')[0];
                let pl = JSON.parse(resp.split('-')[1]);
                plId = pl.id;
                plData[pl.id] = pl;
                fakePl = JSON.parse(JSON.stringify(pl));
                let resMapData = JSON.parse(resp.split('-')[2]);
                let resAllPlData = JSON.parse(resp.split('-')[3]);
                resAllPlData.forEach(x=>{
                    // delete plData[x.id];
                    plData[x.id] = x;
                })
                resMapData.forEach((x, i)=>{
                    if (!x) return;
                    overMap[pl.chunk.y - 1 + Math.floor(i/3)][pl.chunk.x - 1 + i%3] = x;
                    fakeOverMap[pl.chunk.y - 1 + Math.floor(i/3)][pl.chunk.x - 1 + i%3] = x;
                })
                console.log(`%cSuccess. Session: ${session}`, 'color: green');

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