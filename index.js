const express = require('express');

const app = express();
app.use(express.static('static'));

let bodyParser = require('body-parser');
let jsonParser = bodyParser.json();

const server = require('http').createServer(app);
const io = require('socket.io')(server);

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db', sqlite3.OPEN_READWRITE);

db.run(`
    CREATE TABLE IF NOT EXISTS accData (
        userId INTEGER PRIMARY KEY NOT NULL UNIQUE,
        user TEXT NOT NULL UNIQUE,
        pass TEXT NOT NULL
    )
`)

db.run(`
    CREATE TABLE IF NOT EXISTS playerData (
        userId INTEGER PRIMARY KEY NOT NULL UNIQUE,
        data STRING NOT NULL
    )
`)

// db.run(`INSERT INTO accData (user, pass) VALUES ('n1', 'p1')`)

// world[chunkY][chunkX][y][x]
// 0 - ground
// 1 - ice
let players = {};
let world = [];
let chunkX = 16;
let chunkY = 24;
let chunkW = 50;
let chunkH = 25;
for (let y=0; y<chunkY; y++) {
    world.push([]);
    for (let x=0; x<chunkX; x++) {
        world[y].push([]);
        for (let a=0; a<chunkH; a++) {
            world[y][x].push([]);
            for (let b=0; b<chunkW; b++) {
                world[y][x][a].push(((a+b)%2)?0:1);
            }
        }
    }
}

let plRooms = [];
for (let y=0; y<chunkY; y++) {
    plRooms.push([]);
    for (let x=0; x<chunkX; x++) {
        plRooms[y].push([]);
    }
}

function *commandIdGenO() {
    let x = 0;
    while (true) {
        yield x++;
    }
}

let commandIdGen = commandIdGenO();

const port = 3276;

app.get('/', (req, res)=>{
    res.sendFile('index.html');
})

// states: 0 - success, 1 - username taken, 2 - invalid data

app.post('/signup', jsonParser, (req, res)=>{
    let {user, pass} = req.body;
    if (!user || !pass) {
        res.send('2');
        return;
    }
    // check username uniqueness
    db.get('SELECT COUNT(*) FROM accData WHERE user=?', [user], (err, rows) => {
        if (err) throw err;
        if (rows['COUNT(*)'] >= 1) {
            res.send('1');
            return;
        }
        
        // insert acc data
        db.run(`INSERT INTO accData (user, pass) VALUES (?, ?)`, [user, pass], err => {
            if (err) throw err;
            // get userid of the new player
            db.get('SELECT userId FROM accData WHERE user=? AND pass=?', [user, pass], (err, row) => {
                if (err) throw err;
                // put new playerData
                db.run(`INSERT INTO playerData (userId, data) VALUES (?, ?)`, [row.userId, JSON.stringify({
                    id: row.userId,
                    name: user,
                    chunk: {
                        x: 0,
                        y: 1
                    },
                    pos:{
                        x: 4,
                        y: 4
                    }
                })], err => {
                    if (err) throw err;
                    res.send('0');
                })
            })
        })
    })
})

function getNewSes() {
    let ses = Math.round(Math.random() * 1e10);
    if (ses == 0 || ses == 1) {
        ses = getNewSes();
    }
    if (players.hasOwnProperty(ses)) {
        ses = getNewSes();
    }
    return ses;
}

// states: 0 - incorrect, 1 - invalid data, other - session
app.post('/login', jsonParser, (req, res)=>{
    let {user, pass} = req.body;
    if (!user || !pass) {
        res.send('1');
        return;
    }
    // check correctness
    db.get('SELECT COUNT(*) FROM accData WHERE user=? AND pass=?', [user, pass], (err, row) => {
        if (err) throw err;
        if (row['COUNT(*)'] < 1) {
            res.send('0');
            return;
        }
        let ses = getNewSes();
        // get the userId of the player
        db.get('SELECT (userId) FROM accData WHERE user=? AND pass=?', [user, pass], (err, row) => {
            if (err) throw err;
            let id = row.userId;
            // get the playerData of the player
            db.get('SELECT (data) FROM playerData WHERE userId=?', [id], (err, row) => {
                if (err) throw err;
                let data = JSON.parse(row.data);

                let initMapData = [
                    data.chunk.x == 0 || data.chunk.y == 0 ? null : world[data.chunk.y-1][data.chunk.x-1],        data.chunk.y == 0 ? null : world[data.chunk.y-1][data.chunk.x],        data.chunk.x == chunkX-1 || data.chunk.y == 0 ? null : world[data.chunk.y-1][data.chunk.x+1],
                    data.chunk.x == 0 ? null : world[data.chunk.y][data.chunk.x-1],                               world[data.chunk.y][data.chunk.x],                                     data.chunk.x == chunkX-1 ? null : world[data.chunk.y][data.chunk.x+1],
                    data.chunk.x == 0 || data.chunk.y == chunkY-1 ? null : world[data.chunk.y+1][data.chunk.x-1], data.chunk.y == chunkY-1 ? null : world[data.chunk.y+1][data.chunk.x], data.chunk.x == chunkX-1 || data.chunk.y == chunkY-1 ? null : world[data.chunk.y+1][data.chunk.x+1]
                ]

                // send initial chunks player data
                let initChunk = [0, 1]; // x, y
                let initPlayerData = [];
                [-1, 0, 1].forEach(a=>{
                    [-1, 0, 1].forEach(b=>{
                        if (initChunk[0]+a >= 0 && initChunk[0]+a < chunkX && initChunk[1]+b >= 0 && initChunk[1]+b < chunkY) {
                            plRooms[initChunk[1]+b][initChunk[0]+a].forEach(x=>{
                                initPlayerData.push(players[x]);
                            })
                        }
                    })
                })

                players[ses] = data;

                res.send(`${ses.toString()}-${JSON.stringify(data)}-${JSON.stringify(initMapData)}-${JSON.stringify(initPlayerData)}`);

                if (!plRooms.some(x=>x.id==players[ses].id)) {
                    plRooms[initChunk[1]][initChunk[0]].push(ses); // start coord determined in signup function, hard coded
                }
                return;
            })
        })
    })
})

app.post('/logout', jsonParser, (req, res)=>{
    let {session} = req.body;
    // store player data
    db.run('UPDATE playerData SET data=? WHERE userId=?', [JSON.stringify(players[session]), players[session].id], err => {
        if (err) throw err;
        delete players[session];
    })
})

server.listen(port, ()=>{
    console.log(`App hosting on port ${port}`);
})

let sockets = {};

function emitToAdj(cpos, msg, arg) {
    let {x, y} = cpos;
    [-1, 0, 1].forEach(a=>{
        [-1, 0, 1].forEach(b=>{
            if (x+a >= 0 && x+a < chunkX && y+b >= 0 && y+b < chunkY) {
                io.to(`${x+a},${y+b}`).emit(msg, ...arg);
            }
        })
    })
}

io.on('connection', (socket)=>{
    socket.on('initiate', ses=>{
        if (!players.hasOwnProperty(ses)) return;
        sockets[ses] = socket;
        let data = players[ses];
        [-1, 1, 0].forEach(y=>{
            [-1, 1, 0].forEach(x=>{
                if (data.chunk.x + x >= 0 && data.chunk.x + x < chunkX && data.chunk.y + y >= 0 && data.chunk.y + y < chunkY) {
                    io.to(`${data.chunk.x + x},${data.chunk.y + y}`).emit('newPlayer', JSON.stringify(data));
                    socket.join(`${data.chunk.x + x},${data.chunk.y + y}`)
                    // todo: emit to notify joining chunk
                }
            })
        })
    })

    socket.on('movement', (session, direction) => {
        if (direction == 'd') {
            // world boundary check
            if (players[session].chunk.x >= chunkX-1 && players[session].pos.x >= chunkW-1) return;
            
            let destChunk = {
                x: players[session].chunk.x + Math.floor((players[session].pos.x+1)/chunkW),
                y: players[session].chunk.y
            }
            let destPos = {
                x: (players[session].pos.x+1)%chunkW,
                y: players[session].pos.y
            }
            // check if there is player in dest
            if (plRooms[destChunk.y][destChunk.x].some(p=>players[p].pos.x==destPos.x && players[p].pos.y==destPos.y)) {
                return;
            }
            // inc pos
            players[session].pos.x++;
            // roll over chunk
            if (players[session].pos.x >= chunkW) {
                players[session].pos.x = 0;
                // emit to original chunk
                // emitToAdj(players[session].chunk, 'movement', [players[session].id, 'd', thisCmd]);
                emitToAdj(players[session].chunk, 'newPlayer', [JSON.stringify(players[session])]);

                plRooms[players[session].chunk.y][players[session].chunk.x] = plRooms[players[session].chunk.y][players[session].chunk.x].filter(x=>x!=session);
                players[session].chunk.x++;
                plRooms[players[session].chunk.y][players[session].chunk.x].push(session);
                // socket leave rooms
                if (players[session].chunk.y > 0) {
                    sockets[session].leave(`${players[session].chunk.x-2},${players[session].chunk.y-1}`);
                }
                sockets[session].leave(`${players[session].chunk.x-2},${players[session].chunk.y}`);
                if (players[session].chunk.y < chunkY-1) {
                    sockets[session].leave(`${players[session].chunk.x-2},${players[session].chunk.y+1}`);
                }
                // socket join rooms + get new map data to send to client
                let newMapData = {};
                let newPlayerData = [];
                if (players[session].chunk.x < chunkX-1) {
                    if (players[session].chunk.y > 0) {
                        sockets[session].join(`${players[session].chunk.x+1},${players[session].chunk.y-1}`);
                        newMapData[`${players[session].chunk.x+1},${players[session].chunk.y-1}`] = world[players[session].chunk.y-1][players[session].chunk.x+1]

                        io.to(`${players[session].chunk.x+1},${players[session].chunk.y-1}`).emit('newPlayer', JSON.stringify(players[session]));
                    }
                    sockets[session].join(`${players[session].chunk.x+1},${players[session].chunk.y}`);
                    newMapData[`${players[session].chunk.x+1},${players[session].chunk.y}`] = world[players[session].chunk.y][players[session].chunk.x+1]

                    io.to(`${players[session].chunk.x+1},${players[session].chunk.y}`).emit('newPlayer', JSON.stringify(players[session]));
                    if (players[session].chunk.y < chunkY-1) {
                        sockets[session].join(`${players[session].chunk.x+1},${players[session].chunk.y+1}`);
                        newMapData[`${players[session].chunk.x+1},${players[session].chunk.y+1}`] = world[players[session].chunk.y+1][players[session].chunk.x+1]

                        io.to(`${players[session].chunk.x+1},${players[session].chunk.y+1}`).emit('newPlayer', JSON.stringify(players[session]));
                    }
                }

                [-1, 0, 1].forEach(a=>{
                    [-1, 0, 1].forEach(b=>{
                        if (players[session].chunk.x+a >= 0 && players[session].chunk.x+a < chunkX && players[session].chunk.y+b >= 0 && players[session].chunk.y+b < chunkY) {
                            plRooms[players[session].chunk.y+b][players[session].chunk.x+a].forEach(x=>{
                                // console.log(x);
                                newPlayerData.push(players[x]);
                            })
                        }
                    })
                })

                // pm new map data, new player data
                io.to(sockets[session].id).emit('newMapData', JSON.stringify(newMapData));
                io.to(sockets[session].id).emit('newPlayerData', JSON.stringify(newPlayerData));

                // todo: sent map data after crossing chunk border
            }
            
            // emit to new chunk (or original chunk if no chunk border passed)
            // emitToAdj(players[session].chunk, 'movement', [players[session].id, 'd', thisCmd]);
            emitToAdj(players[session].chunk, 'newPlayer', [JSON.stringify(players[session])]);
        }
        else if (direction == 'a') {
            // world boundary check
            if (players[session].chunk.x <= 0 && players[session].pos.x <= 0) return;
            let destChunk = {
                x: players[session].chunk.x + Math.floor((players[session].pos.x-1)/chunkW),
                y: players[session].chunk.y
            }
            let destPos = {
                x: (players[session].pos.x-1+chunkW)%chunkW,
                y: players[session].pos.y
            }
            // check if there is player in dest
            if (plRooms[destChunk.y][destChunk.x].some(p=>players[p].pos.x==destPos.x && players[p].pos.y==destPos.y)) {
                return;
            }
            // inc pos
            players[session].pos.x--;
            // roll over chunk
            if (players[session].pos.x < 0) {
                players[session].pos.x = chunkW-1;
                // emit to original chunk
                // emitToAdj(players[session].chunk, 'movement', [players[session].id, 'a', thisCmd]);
                plRooms[players[session].chunk.y][players[session].chunk.x] = plRooms[players[session].chunk.y][players[session].chunk.x].filter(x=>x!=session);
                players[session].chunk.x--;
                plRooms[players[session].chunk.y][players[session].chunk.x].push(session);
                // socket leave rooms
                if (players[session].chunk.y > 0) {
                    sockets[session].leave(`${players[session].chunk.x+2},${players[session].chunk.y-1}`);
                }
                sockets[session].leave(`${players[session].chunk.x+2},${players[session].chunk.y}`);
                if (players[session].chunk.y < chunkY-1) {
                    sockets[session].leave(`${players[session].chunk.x+2},${players[session].chunk.y+1}`);
                }
                // socket join rooms + get new map data to send to client
                let newMapData = {};
                let newPlayerData = [];
                if (players[session].chunk.x > 0) {
                    if (players[session].chunk.y > 0) {
                        sockets[session].join(`${players[session].chunk.x-1},${players[session].chunk.y-1}`);
                        newMapData[`${players[session].chunk.x-1},${players[session].chunk.y-1}`] = world[players[session].chunk.y-1][players[session].chunk.x-1]

                        io.to(`${players[session].chunk.x-1},${players[session].chunk.y-1}`).emit('newPlayer', JSON.stringify(players[session]));
                    }
                    sockets[session].join(`${players[session].chunk.x-1},${players[session].chunk.y}`);
                    newMapData[`${players[session].chunk.x-1},${players[session].chunk.y-1}`] = world[players[session].chunk.y][players[session].chunk.x-1]

                    io.to(`${players[session].chunk.x-1},${players[session].chunk.y}`).emit('newPlayer', JSON.stringify(players[session]));
                    if (players[session].chunk.y < chunkY-1) {
                        sockets[session].join(`${players[session].chunk.x-1},${players[session].chunk.y+1}`);
                        newMapData[`${players[session].chunk.x-1},${players[session].chunk.y+1}`] = world[players[session].chunk.y+1][players[session].chunk.x-1]

                        io.to(`${players[session].chunk.x-1},${players[session].chunk.y+1}`).emit('newPlayer', JSON.stringify(players[session]));
                    }
                }

                // get new 3x3 player data
                [-1, 0, 1].forEach(a=>{
                    [-1, 0, 1].forEach(b=>{
                        if (players[session].chunk.x+a >= 0 && players[session].chunk.x+a < chunkX && players[session].chunk.y+b >= 0 && players[session].chunk.y+b < chunkY) {
                            plRooms[players[session].chunk.y+b][players[session].chunk.x+a].forEach(x=>{
                                // console.log(x);
                                newPlayerData.push(players[x]);
                            })
                        }
                    })
                })

                // pm new map data
                io.to(sockets[session].id).emit('newMapData', JSON.stringify(newMapData));
                io.to(sockets[session].id).emit('newPlayerData', JSON.stringify(newPlayerData));

                // todo: sent map data after crossing chunk border
            }
            else {
                // emit to new chunk (or original chunk if no chunk border passed)
                // emitToAdj(players[session].chunk, 'movement', [players[session].id, 'a', thisCmd]);
                emitToAdj(players[session].chunk, 'newPlayer', [JSON.stringify(players[session])]);
            }
        }
        if (direction == 's') {
            // world boundary check
            if (players[session].chunk.y >= chunkY-1 && players[session].pos.y >= chunkH-1) return;
            let destChunk = {
                x: players[session].chunk.x,
                y: players[session].chunk.y + Math.floor((players[session].pos.y+1)/chunkH)
            }
            let destPos = {
                x: players[session].pos.x,
                y: (players[session].pos.y+1)%chunkH
            }
            // check if there is player in dest
            if (plRooms[destChunk.y][destChunk.x].some(p=>players[p].pos.x==destPos.x && players[p].pos.y==destPos.y)) {
                return;
            }
            // inc pos
            players[session].pos.y++;
            // roll over chunk
            if (players[session].pos.y >= chunkH) {
                players[session].pos.y = 0;
                // emit to original chunk
                // emitToAdj(players[session].chunk, 'movement', [players[session].id, 's', thisCmd]);

                // remove from original plRoom
                plRooms[players[session].chunk.y][players[session].chunk.x] = plRooms[players[session].chunk.y][players[session].chunk.x].filter(x=>x!=session);
                players[session].chunk.y++;
                // add to new plRoom
                plRooms[players[session].chunk.y][players[session].chunk.x].push(session);
                // socket leave rooms
                if (players[session].chunk.x > 0) {
                    sockets[session].leave(`${players[session].chunk.x-1},${players[session].chunk.y-2}`);
                }
                sockets[session].leave(`${players[session].chunk.x},${players[session].chunk.y-2}`);
                if (players[session].chunk.x < chunkX-1) {
                    sockets[session].leave(`${players[session].chunk.x-1},${players[session].chunk.y-2}`);
                }
                // socket join rooms + get new map data to send to client
                let newMapData = {};
                let newPlayerData = [];
                if (players[session].chunk.y < chunkY-1) {
                    if (players[session].chunk.x > 0) {
                        sockets[session].join(`${players[session].chunk.x-1},${players[session].chunk.y+1}`);
                        newMapData[`${players[session].chunk.x-1},${players[session].chunk.y+1}`] = world[players[session].chunk.y+1][players[session].chunk.x-1]

                        io.to(`${players[session].chunk.x-1},${players[session].chunk.y+1}`).emit('newPlayer', JSON.stringify(players[session]));
                    }
                    sockets[session].join(`${players[session].chunk.x},${players[session].chunk.y+1}`);
                    newMapData[`${players[session].chunk.x},${players[session].chunk.y+1}`] = world[players[session].chunk.y+1][players[session].chunk.x]

                    io.to(`${players[session].chunk.x},${players[session].chunk.y+1}`).emit('newPlayer', JSON.stringify(players[session]));
                    if (players[session].chunk.x < chunkX-1) {
                        sockets[session].join(`${players[session].chunk.x+1},${players[session].chunk.y+1}`);
                        newMapData[`${players[session].chunk.x+1},${players[session].chunk.y+1}`] = world[players[session].chunk.y+1][players[session].chunk.x+1]
                        
                        io.to(`${players[session].chunk.x+1},${players[session].chunk.y+1}`).emit('newPlayer', JSON.stringify(players[session]));
                    }

                    // get new 3x3 player data
                    [-1, 0, 1].forEach(a=>{
                        [-1, 0, 1].forEach(b=>{
                            if (players[session].chunk.x+a >= 0 && players[session].chunk.x+a < chunkX && players[session].chunk.y+b >= 0 && players[session].chunk.y+b < chunkY) {
                                plRooms[players[session].chunk.y+b][players[session].chunk.x+a].forEach(x=>{
                                    // console.log(x);
                                    newPlayerData.push(players[x]);
                                })
                            }
                        })
                    })
                }

                // pm new map data
                io.to(sockets[session].id).emit('newMapData', JSON.stringify(newMapData));
                io.to(sockets[session].id).emit('newPlayerData', JSON.stringify(newPlayerData));

                // todo: sent map data after crossing chunk border
            }
            else {
            // emit to new chunk (or original chunk if no chunk border passed)
                // emitToAdj(players[session].chunk, 'movement', [players[session].id, 's', thisCmd]);
                emitToAdj(players[session].chunk, 'newPlayer', [JSON.stringify(players[session])]);
            }
        }
        if (direction == 'w') {
            // world boundary check
            if (players[session].chunk.y <= 0 && players[session].pos.y <= 0) return;
            let destChunk = {
                x: players[session].chunk.x,
                y: players[session].chunk.y + Math.floor((players[session].pos.y-1)/chunkH)
            }
            let destPos = {
                x: players[session].pos.x,
                y: (players[session].pos.y-1+chunkH)%chunkH
            }
            // check if there is player in dest
            if (plRooms[destChunk.y][destChunk.x].some(p=>players[p].pos.x==destPos.x && players[p].pos.y==destPos.y)) {
                return;
            }
            // inc pos
            players[session].pos.y--;
            // roll over chunk
            if (players[session].pos.y < 0) {
                players[session].pos.y = chunkH-1;
                // emit to original chunk
                // emitToAdj(players[session].chunk, 'movement', [players[session].id, 'w', thisCmd]);
                plRooms[players[session].chunk.y][players[session].chunk.x] = plRooms[players[session].chunk.y][players[session].chunk.x].filter(x=>x!=session);
                players[session].chunk.y--;
                plRooms[players[session].chunk.y][players[session].chunk.x].push(session);
                // socket leave rooms
                if (players[session].chunk.x > 0) {
                    sockets[session].leave(`${players[session].chunk.x-1},${players[session].chunk.y+2}`);
                }
                sockets[session].leave(`${players[session].chunk.x},${players[session].chunk.y+2}`);
                if (players[session].chunk.x < chunkX-1) {
                    sockets[session].leave(`${players[session].chunk.x-1},${players[session].chunk.y+2}`);
                }
                // socket join rooms + get new map data to send to client
                let newMapData = {};
                let newPlayerData = [];
                if (players[session].chunk.y > 0) {
                    if (players[session].chunk.x > 0) {
                        sockets[session].join(`${players[session].chunk.x-1},${players[session].chunk.y-1}`);
                        newMapData[`${players[session].chunk.x-1},${players[session].chunk.y-1}`] = world[players[session].chunk.y-1][players[session].chunk.x-1]

                        io.to(`${players[session].chunk.x-1},${players[session].chunk.y-1}`).emit('newPlayer', JSON.stringify(players[session]));
                    }
                    sockets[session].join(`${players[session].chunk.x},${players[session].chunk.y-1}`);
                    newMapData[`${players[session].chunk.x},${players[session].chunk.y-1}`] = world[players[session].chunk.y-1][players[session].chunk.x]

                    io.to(`${players[session].chunk.x},${players[session].chunk.y-1}`).emit('newPlayer', JSON.stringify(players[session]));
                    if (players[session].chunk.x < chunkX-1) {
                        sockets[session].join(`${players[session].chunk.x+1},${players[session].chunk.y-1}`);
                        newMapData[`${players[session].chunk.x+1},${players[session].chunk.y-1}`] = world[players[session].chunk.y-1][players[session].chunk.x+1]

                        io.to(`${players[session].chunk.x+1},${players[session].chunk.y-1}`).emit('newPlayer', JSON.stringify(players[session]));
                    }
                }

                [-1, 0, 1].forEach(a=>{
                    [-1, 0, 1].forEach(b=>{
                        if (players[session].chunk.x+a >= 0 && players[session].chunk.x+a < chunkX && players[session].chunk.y+b >= 0 && players[session].chunk.y+b < chunkY) {
                            plRooms[players[session].chunk.y+b][players[session].chunk.x+a].forEach(x=>{
                                // console.log(x);
                                newPlayerData.push(players[x]);
                            })
                        }
                    })
                })

                // pm new map data
                io.to(sockets[session].id).emit('newMapData', JSON.stringify(newMapData));
                io.to(sockets[session].id).emit('newPlayerData', JSON.stringify(newPlayerData));

                // todo: sent map data after crossing chunk border
            }
            else {
                // emit to new chunk (or original chunk if no chunk border passed)
                // emitToAdj(players[session].chunk, 'movement', [players[session].id, 'w', thisCmd]);
                emitToAdj(players[session].chunk, 'newPlayer', [JSON.stringify(players[session])]);
            }
        }
    })
})
