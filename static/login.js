const chw = 50;  // CHunk Width
const chh = 25;  // CHunk Height
const chnx = 16; // CHunk Number X
const chny = 24; // CHunk Number Y

let session = null;
let mapData = [];
for (let y=0; y<chny; y++) {
    mapData.push([]);
    for (let x=0; x<chnx; x++) {
        mapData[y].push(null);
    }
}
let pl = null;
let plRange = []; // players in updating range

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
                pl = JSON.parse(resp.split('-')[1]);
                plRange.push({id: pl.id, chunk:pl.chunk, pos:pl.pos});
                let resMapData = JSON.parse(resp.split('-')[2]);
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