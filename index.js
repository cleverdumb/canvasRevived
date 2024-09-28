const express = require('express');

const app = express();
app.use(express.static('static'));

let bodyParser = require('body-parser');
let jsonParser = bodyParser.json();

const server = require('http').createServer(app);
const io = require('socket.io')(server);

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db', sqlite3.OPEN_READWRITE);

const {B, I, baseRecipes, unstack, axe, pickaxe, requireAxe, requirePickaxe, toolCd, sword, dmg, interactable, passable, smelterRecipes, usable, nonFallThrough, placeable, toolMaxDura, arrow} = require('./blockIds.js');

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

const treeRegrowTime = 200000;
const stoneRegrowTime = 200000;
const cropStageTime = 5000;

// ! Ceilings go in the floor below, passable but non-fall through, no render when player below or on the same layer

// ! testing use
let lagSim = 0;

// db.run(`INSERT INTO accData (user, pass) VALUES ('n1', 'p1')`)

// world[chunkY][chunkX][y][x][z]
let players = {};
let world = [];
let chunkX = 16;
let chunkY = 24;
let chunkW = 50;
let chunkH = 25;
let layers = 5;  // 0 is ground, 1/2/3 go up, 3 is top
let cropHeartBeat = [];

// * world gen

for (let y=0; y<chunkY; y++) {
    world.push([]);
    for (let x=0; x<chunkX; x++) {
        world[y].push([]);
        for (let a=0; a<chunkH; a++) {
            world[y][x].push([]);
            for (let b=0; b<chunkW; b++) {
                world[y][x][a].push([]);
                for (let z=0; z<layers; z++) {
                    // world[y][x][a][b].push(z==0 ? B.GRASS : ((a>5 || b>5) && z==1) ? (B.TREE) : null);
                    // world[y][x][a][b].push(z==0 ? (Math.random() > 0.5 ? B.GRASS : B.STUMP) : null);
                    // world[y][x][a][b].push(z==0 ? B.GRASS : null);
                    world[y][x][a][b].push(z==0 ? (a == chunkH-1 || b == chunkW-1 ? B.STONEBASE : B.GRASS) : null);
                    // if (z == 0) {
                    //     world[y][x][a][b].push(B.GRASS);
                    // }
                    // else if (z == 1) {
                    //     if (x==0 && y==0) {
                    //         if (a/2 >= b) {
                    //             world[y][x][a][b].push(B.TREE);
                    //         }
                    //         else if (b/2 >= a) {
                    //             if (Math.random() > 0.9) {
                    //                 world[y][x][a][b].push(B.IRON);
                    //             }
                    //             else { 
                    //                 world[y][x][a][b].push(B.STONE);
                    //             }
                    //         }
                    //         else {
                    //             if ((a+b) > 8 && (a+b) < 15) {
                    //                 world[y][x][a][b].push(B.SMELTER);
                    //             }
                    //             else {
                    //                 world[y][x][a][b].push(null);
                    //             }
                    //         }
                    //     }
                    //     else {
                    //         world[y][x][a][b].push(null);
                    //     }
                    // }
                    // else {
                    //     world[y][x][a][b].push(null);
                    // }
                }
            }
        }
    }
}

// world[0][0][5][5][3] = B.STONE;
// world[0][0][4][5][1] = B.TOMATO3;

let plRooms = [];
for (let y=0; y<chunkY; y++) {
    plRooms.push([]);
    for (let x=0; x<chunkX; x++) {
        plRooms[y].push([]);
    }
}

let npcs = [];
for (let y=0; y<chunkY; y++) {
    npcs.push([]);
    for (let x=0; x<chunkX; x++) {
        npcs[y].push([]);
    }
}

let npcObj = {};

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
                        y: 0
                    },
                    pos:{
                        x: 4,
                        y: 4
                    },
                    z: 1,
                    inv: {
                        6: {
                            instances: 1,
                            duras: [10]
                        },
                        7: {
                            instances: 1,
                            duras: [10]
                        },
                        10: {
                            instances: 1,
                            duras: [10]
                        },
                        19: {
                            instances: 1,
                            duras: [100]
                        },
                        22: {
                            instances: 1,
                            duras: [100]
                        },
                        23: {
                            instances: 1,
                            duras: [100]
                        },
                        20: 3,
                        21: 4,
                        14: 1,
                        1: 100,
                        5: 6,
                        15: 50,
                        12: 50,
                        17: 50
                    },
                    hp: 75,
                    maxHp: 100,
                    holding: {id: 19, ins: 0},
                    ammo: null,
                    faceLeft: false,
                    facing: 'd',
                    lastAction: 0,
                    aggroed: []
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
                // ! set if changed
                let initChunk = [0, 0]; // x, y
                let initPlayerData = [];
                let initNpcData = [];
                [-1, 0, 1].forEach(a=>{
                    [-1, 0, 1].forEach(b=>{
                        if (initChunk[0]+a >= 0 && initChunk[0]+a < chunkX && initChunk[1]+b >= 0 && initChunk[1]+b < chunkY) {
                            plRooms[initChunk[1]+b][initChunk[0]+a].forEach(x=>{
                                initPlayerData.push(players[x])
                            })
                            npcs[initChunk[1]+b][initChunk[0]+a].forEach(x=>{
                                initNpcData.push(x.data);
                            })
                        }
                    })
                })

                players[ses] = data;
                
                res.send(`${ses.toString()}-${JSON.stringify(data)}-${JSON.stringify(initMapData)}-${JSON.stringify(initPlayerData)}-${JSON.stringify(initNpcData)}`);

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
let reverseSockets = {};

function emitToAdj(cpos, msg, arg) {
    let {x, y} = cpos;
    [-1, 0, 1].forEach(a=>{
        [-1, 0, 1].forEach(b=>{
            if (x+a >= 0 && x+a < chunkX && y+b >= 0 && y+b < chunkY) {
                setTimeout(()=>{
                    io.to(`${x+a},${y+b}`).emit(msg, ...arg);
                }, lagSim)
            }
        })
    })
}

function emitToAdjNoSender(cpos, msg, arg, socket) {
    let {x, y} = cpos;
    [-1, 0, 1].forEach(a=>{
        [-1, 0, 1].forEach(b=>{
            if (x+a >= 0 && x+a < chunkX && y+b >= 0 && y+b < chunkY) {
                setTimeout(()=>{
                    socket.to(`${x+a},${y+b}`).emit(msg, ...arg);
                }, lagSim)
            }
        })
    })
}

io.on('connection', (socket)=>{
    socket.on('initiate', ses=>{
        if (!players.hasOwnProperty(ses)) return;
        sockets[ses] = socket;
        reverseSockets[socket.id] = ses;
        let data = players[ses];
        [-1, 1, 0].forEach(y=>{
            [-1, 1, 0].forEach(x=>{
                if (data.chunk.x + x >= 0 && data.chunk.x + x < chunkX && data.chunk.y + y >= 0 && data.chunk.y + y < chunkY) {
                    io.to(`${data.chunk.x + x},${data.chunk.y + y}`).emit('newPlayer', JSON.stringify(data));
                    socket.join(`${data.chunk.x + x},${data.chunk.y + y}`)
                }
            })
        })
    })

    socket.on('movement', (session, direction, cmdId, hitNpc) => {
        if (direction == 'd' || direction == 'a') {
            players[session].faceLeft = direction == 'a';
            players[session].facing = direction;
            // world boundary check
            if (direction == 'd' && players[session].chunk.x >= chunkX-1 && players[session].pos.x >= chunkW-1) {
                setTimeout(()=>{
                    io.to(socket.id).emit('rejectCmd', cmdId);
                }, lagSim);
                return;
            }

            if (direction == 'a' && players[session].chunk.x <= 0 && players[session].pos.x <= 0) {
                setTimeout(()=>{
                    io.to(socket.id).emit('rejectCmd', cmdId);
                }, lagSim);
                return;
            }

            let multiplier = direction == 'd' ? 1 : -1;
            
            let destChunk = {
                x: players[session].chunk.x + Math.floor((players[session].pos.x+(multiplier))/chunkW),
                y: players[session].chunk.y
            }
            let destPos = {
                x: (players[session].pos.x + multiplier + chunkW)%chunkW,
                y: players[session].pos.y,
                z: players[session].z
            }

            if (hitNpc) {
                if (players[session].holding !== null && sword.includes(parseInt(players[session].holding.id))) { 
                    let npcInDest = false;
                    let targetNpc = null;
                    npcs[destChunk.y][destChunk.x].forEach(n=>{
                        if (n.data.pos.x==destPos.x && n.data.pos.y == destPos.y && n.data.pos.z == destPos.z) {
                            npcInDest = true;
                            targetNpc = n;
                        }
                    })

                    if (npcInDest) {
                        players[session].lastAction = Date.now();
                        targetNpc.move(direction);
                        targetNpc.damage(session, dmg[parseInt(players[session].holding.id)]);
                        players[session].facing = direction;
                        if (direction == 'a') players[session].faceLeft = true;
                        if (direction == 'd') players[session].faceLeft = false;
                        io.to(socket.id).emit('authCmd', cmdId);
                    }
                    else {
                        io.to(socket.id).emit('rejectCmd', cmdId);
                    }
                }
                return;
            }

            // check if there is player in dest
            if (plRooms[destChunk.y][destChunk.x].some(p=>players[p].pos.x==destPos.x && players[p].pos.y==destPos.y && players[p].z == destPos.z)) {
                setTimeout(()=>{
                    io.to(socket.id).emit('rejectCmd', cmdId);
                }, lagSim);
                return;
            }

            if ((world[destChunk.y][destChunk.x][destPos.y][destPos.x][destPos.z] !== null && (!passable.includes(world[destChunk.y][destChunk.x][destPos.y][destPos.x][destPos.z]))) && (destPos.z < 5)) {
                setTimeout(()=>{
                    io.to(socket.id).emit('rejectCmd', cmdId);
                }, lagSim);
                return;
            }

            let destColumn = world[destChunk.y][destChunk.x][destPos.y][destPos.x].slice(0, destPos.z).slice().reverse();
            for (let i=0; i<destColumn.length; i++) {
                if (destColumn[i] !== null && ((!passable.includes(destColumn[i])) || nonFallThrough.includes(destColumn[i]))) {
                    destPos.z -= i;
                    break;
                }
            }

            players[session].z = destPos.z;
            // inc pos
            players[session].pos.x += multiplier;
            // roll over chunk
            if ((players[session].pos.x >= chunkW && direction == 'd') || (players[session].pos.x < 0 && direction == 'a')) {
                players[session].pos.x = direction == 'd' ? 0 : chunkW - 1;
                // emit to original chunk
                setTimeout(()=>{
                    let {x, y} = players[session].chunk;
                    [-1, 0, 1].forEach(a=>{
                        [-1, 0, 1].forEach(b=>{
                            if (x+a >= 0 && x+a < chunkX && y+b >= 0 && y+b < chunkY) {
                                socket.to(`${x+a},${y+b}`).emit('newPlayer', JSON.stringify(players[session]));
                            }
                        })
                    })
                },lagSim);

                plRooms[players[session].chunk.y][players[session].chunk.x] = plRooms[players[session].chunk.y][players[session].chunk.x].filter(x=>x!=session);
                players[session].chunk.x += multiplier;
                plRooms[players[session].chunk.y][players[session].chunk.x].push(session);
                // socket leave rooms
                if (players[session].chunk.y > 0) {
                    sockets[session].leave(`${players[session].chunk.x - (2*multiplier)},${players[session].chunk.y-1}`);
                }
                sockets[session].leave(`${players[session].chunk.x - (2*multiplier)},${players[session].chunk.y}`);
                if (players[session].chunk.y < chunkY-1) {
                    sockets[session].leave(`${players[session].chunk.x - (2*multiplier)},${players[session].chunk.y+1}`);
                }
                // socket join rooms + get new map data to send to client
                let newMapData = {};
                let newPlayerData = [];
                let newNpcData = [];
                if ((players[session].chunk.x + multiplier) < chunkX && (players[session].chunk.x + multiplier) >= 0) {
                    if (players[session].chunk.y > 0) {
                        sockets[session].join(`${players[session].chunk.x + multiplier},${players[session].chunk.y-1}`);
                        newMapData[`${players[session].chunk.x + multiplier},${players[session].chunk.y-1}`] = world[players[session].chunk.y-1][players[session].chunk.x + multiplier]

                        setTimeout(()=>{
                            socket.to(`${players[session].chunk.x + multiplier},${players[session].chunk.y-1}`).emit('newPlayer', JSON.stringify(players[session]));
                        }, lagSim)
                    }
                    sockets[session].join(`${players[session].chunk.x + multiplier},${players[session].chunk.y}`);
                    newMapData[`${players[session].chunk.x + multiplier},${players[session].chunk.y}`] = world[players[session].chunk.y][players[session].chunk.x + multiplier]

                    setTimeout(()=>{
                        socket.to(`${players[session].chunk.x + multiplier},${players[session].chunk.y}`).emit('newPlayer', JSON.stringify(players[session]));
                    }, lagSim)
                    if (players[session].chunk.y < chunkY-1) {
                        sockets[session].join(`${players[session].chunk.x + multiplier},${players[session].chunk.y+1}`);
                        newMapData[`${players[session].chunk.x + multiplier},${players[session].chunk.y+1}`] = world[players[session].chunk.y+1][players[session].chunk.x + multiplier]
                        
                        setTimeout(()=>{
                            socket.to(`${players[session].chunk.x + multiplier},${players[session].chunk.y+1}`).emit('newPlayer', JSON.stringify(players[session]));
                        }, lagSim)
                    }
                }

                [-1, 0, 1].forEach(a=>{
                    [-1, 0, 1].forEach(b=>{
                        if (players[session].chunk.x+a >= 0 && players[session].chunk.x+a < chunkX && players[session].chunk.y+b >= 0 && players[session].chunk.y+b < chunkY) {
                            plRooms[players[session].chunk.y+b][players[session].chunk.x+a].forEach(x=>{
                                newPlayerData.push(players[x]);
                            })
                            npcs[players[session].chunk.y+b][players[session].chunk.x+a].forEach(x=>{
                                newNpcData.push(x.data);
                            })
                        }
                    })
                })

                // pm new map data, new player data
                setTimeout(()=>{
                    io.to(sockets[session].id).emit('newMapData', JSON.stringify(newMapData));
                    io.to(sockets[session].id).emit('newPlayerData', JSON.stringify(newPlayerData));
                    io.to(sockets[session].id).emit('newNpcData', JSON.stringify(newNpcData));
                }, lagSim)
            }
            
            // emit to new chunk (or original chunk if no chunk border passed)
            setTimeout(()=>{
                let {x, y} = players[session].chunk;
                [-1, 0, 1].forEach(a=>{
                    [-1, 0, 1].forEach(b=>{
                        if (x+a >= 0 && x+a < chunkX && y+b >= 0 && y+b < chunkY) {
                            socket.to(`${x+a},${y+b}`).emit('newPlayer', JSON.stringify(players[session]));
                        }
                    })
                })
                
                io.to(socket.id).emit('authCmd', cmdId);
            }, lagSim);
            afterMovement(session, direction);
        }
        else if (direction == 's' || direction == 'w') {
            players[session].facing = direction;
            // world boundary check
            if (direction == 's' && players[session].chunk.y >= chunkY-1 && players[session].pos.y >= chunkH-1) {
                setTimeout(()=>{
                    io.to(socket.id).emit('rejectCmd', cmdId);
                }, lagSim);
                return;
            }

            if (direction == 'w' && players[session].chunk.y <= 0 && players[session].pos.y <= 0) {
                setTimeout(()=>{
                    io.to(socket.id).emit('rejectCmd', cmdId);
                }, lagSim);
                return;
            }

            let multiplier = direction == 's' ? 1 : -1;
            
            let destChunk = {
                x: players[session].chunk.x,
                y: players[session].chunk.y + Math.floor((players[session].pos.y+(multiplier))/chunkH)
            }
            let destPos = {
                x: players[session].pos.x,
                y: (players[session].pos.y + multiplier + chunkH)%chunkH,
                z: players[session].z
            }

            if (hitNpc) {
                if (players[session].holding !== null && sword.includes(parseInt(players[session].holding.id))) { 
                    let npcInDest = false;
                    let targetNpc = null;
                    npcs[destChunk.y][destChunk.x].forEach(n=>{
                        if (n.data.pos.x==destPos.x && n.data.pos.y == destPos.y && n.data.pos.z == destPos.z) {
                            npcInDest = true;
                            targetNpc = n;
                        }
                    })

                    if (npcInDest && (Date.now() - players[session].lastAction) > toolCd[parseInt(players[session].holding.id)]) {
                        players[session].lastAction = Date.now();
                        targetNpc.move(direction);
                        targetNpc.damage(session, dmg[parseInt(players[session].holding.id)]);
                        players[session].facing = direction;
                        if (direction == 'a') players[session].faceLeft = true;
                        if (direction == 'd') players[session].faceLeft = false;
                        io.to(socket.id).emit('authCmd', cmdId);
                    }
                    else {
                        io.to(socket.id).emit('rejectCmd', cmdId);
                    }
                }
                return;
            }

            // check if there is player in dest
            if (plRooms[destChunk.y][destChunk.x].some(p=>players[p].pos.x==destPos.x && players[p].pos.y==destPos.y && players[p].z == destPos.z)) {
                setTimeout(()=>{
                    io.to(socket.id).emit('rejectCmd', cmdId);
                }, lagSim);
                return;
            }

            if ((world[destChunk.y][destChunk.x][destPos.y][destPos.x][destPos.z] !== null && (!passable.includes(world[destChunk.y][destChunk.x][destPos.y][destPos.x][destPos.z]))) && (destPos.z < 5)) {
                setTimeout(()=>{
                    io.to(socket.id).emit('rejectCmd', cmdId);
                }, lagSim);
                return;
            }

            let destColumn = world[destChunk.y][destChunk.x][destPos.y][destPos.x].slice(0, destPos.z).slice().reverse();
            for (let i=0; i<destColumn.length; i++) {
                if (destColumn[i] !== null && ((!passable.includes(destColumn[i])) || nonFallThrough.includes(destColumn[i]))) {
                    destPos.z -= i;
                    break;
                }
            }
            players[session].z = destPos.z;

            // inc pos
            players[session].pos.y += multiplier;
            // roll over chunk
            if ((players[session].pos.y >= chunkH && direction == 's') || (players[session].pos.y < 0 && direction == 'w')) {
                players[session].pos.y = direction == 's' ? 0 : chunkH - 1;
                // emit to original chunk
                setTimeout(()=>{
                    let {x, y} = players[session].chunk;
                    [-1, 0, 1].forEach(a=>{
                        [-1, 0, 1].forEach(b=>{
                            if (x+a >= 0 && x+a < chunkX && y+b >= 0 && y+b < chunkY) {
                                socket.to(`${x+a},${y+b}`).emit('newPlayer', JSON.stringify(players[session]));
                            }
                        })
                    })
                },lagSim);

                plRooms[players[session].chunk.y][players[session].chunk.x] = plRooms[players[session].chunk.y][players[session].chunk.x].filter(x=>x!=session);
                players[session].chunk.y += multiplier;
                plRooms[players[session].chunk.y][players[session].chunk.x].push(session);
                // socket leave rooms
                if (players[session].chunk.x > 0) {
                    sockets[session].leave(`${players[session].chunk.x-1},${players[session].chunk.y - (2*multiplier)}`);
                }
                sockets[session].leave(`${players[session].chunk.x},${players[session].chunk.y - (2*multiplier)}`);
                if (players[session].chunk.x < chunkX-1) {
                    sockets[session].leave(`${players[session].chunk.x+1},${players[session].chunk.y - (2*multiplier)}`);
                }
                // socket join rooms + get new map data to send to client
                let newMapData = {};
                let newPlayerData = [];
                let newNpcData = [];
                if ((players[session].chunk.y + multiplier) < chunkY && (players[session].chunk.y + multiplier) >= 0) {
                    if (players[session].chunk.x > 0) {
                        sockets[session].join(`${players[session].chunk.x-1},${players[session].chunk.y + multiplier}`);
                        newMapData[`${players[session].chunk.x-1},${players[session].chunk.y + multiplier}`] = world[players[session].chunk.y + multiplier][players[session].chunk.x-1]

                        setTimeout(()=>{
                            socket.to(`${players[session].chunk.x-1},${players[session].chunk.y + multiplier}`).emit('newPlayer', JSON.stringify(players[session]));
                        }, lagSim)
                    }
                    sockets[session].join(`${players[session].chunk.x},${players[session].chunk.y + multiplier}`);
                    newMapData[`${players[session].chunk.x},${players[session].chunk.y + multiplier}`] = world[players[session].chunk.y + multiplier][players[session].chunk.x]

                    setTimeout(()=>{
                        socket.to(`${players[session].chunk.x},${players[session].chunk.y + multiplier}`).emit('newPlayer', JSON.stringify(players[session]));
                    }, lagSim)
                    if (players[session].chunk.x < chunkX-1) {
                        sockets[session].join(`${players[session].chunk.x+1},${players[session].chunk.y + multiplier}`);
                        newMapData[`${players[session].chunk.x+1},${players[session].chunk.y + multiplier}`] = world[players[session].chunk.y + multiplier][players[session].chunk.x+1]
                        
                        setTimeout(()=>{
                            socket.to(`${players[session].chunk.x+1},${players[session].chunk.y + multiplier}`).emit('newPlayer', JSON.stringify(players[session]));
                        }, lagSim)
                    }
                }

                [-1, 0, 1].forEach(a=>{
                    [-1, 0, 1].forEach(b=>{
                        if (players[session].chunk.x+a >= 0 && players[session].chunk.x+a < chunkX && players[session].chunk.y+b >= 0 && players[session].chunk.y+b < chunkY) {
                            plRooms[players[session].chunk.y+b][players[session].chunk.x+a].forEach(x=>{
                                newPlayerData.push(players[x]);
                            })
                            npcs[players[session].chunk.y+b][players[session].chunk.x+a].forEach(x=>{
                                newNpcData.push(x.data);
                            })
                        }
                    })
                })

                // pm new map data, new player data
                setTimeout(()=>{
                    io.to(sockets[session].id).emit('newMapData', JSON.stringify(newMapData));
                    io.to(sockets[session].id).emit('newPlayerData', JSON.stringify(newPlayerData));
                    io.to(sockets[session].id).emit('newNpcData', JSON.stringify(newNpcData));
                }, lagSim)
            }
            
            // emit to new chunk (or original chunk if no chunk border passed)
            setTimeout(()=>{
                let {x, y} = players[session].chunk;
                [-1, 0, 1].forEach(a=>{
                    [-1, 0, 1].forEach(b=>{
                        if (x+a >= 0 && x+a < chunkX && y+b >= 0 && y+b < chunkY) {
                            socket.to(`${x+a},${y+b}`).emit('newPlayer', JSON.stringify(players[session]));
                        }
                    })
                })
                
                io.to(socket.id).emit('authCmd', cmdId);
            }, lagSim);

            afterMovement(session, direction);
        }
    })

    socket.on('interact', (session, direction, cmdId, seed) => {
        let data = players[session];
        let destChunk, destPos;
        if (direction == 'a' || direction == 'd') {
            if (direction == 'd' && players[session].chunk.x >= chunkX-1 && players[session].pos.x >= chunkW-1) {
                setTimeout(()=>{
                    io.to(socket.id).emit('rejectCmd', cmdId);
                }, lagSim);
                return;
            }

            if (direction == 'a' && players[session].chunk.x <= 0 && players[session].pos.x <= 0) {
                setTimeout(()=>{
                    io.to(socket.id).emit('rejectCmd', cmdId);
                }, lagSim);
                return;
            }

            let xMult = direction == 'd' ? 1 : -1;
            destChunk = {
                x: (data.chunk.x + Math.floor((data.pos.x + xMult)/chunkW)),
                y: data.chunk.y
            }
            destPos = {
                x: (data.pos.x + xMult + chunkW)%chunkW,
                y: data.pos.y,
                z: data.z
            }

            players[session].facing = direction;
            players[session].faceLeft = direction == 'a';
        }
        else if (direction == 's' || direction == 'w') {
            if (direction == 's' && players[session].chunk.y >= chunkY-1 && players[session].pos.y >= chunkH-1) {
                setTimeout(()=>{
                    io.to(socket.id).emit('rejectCmd', cmdId);
                }, lagSim);
                return;
            }

            if (direction == 'w' && players[session].chunk.y <= 0 && players[session].pos.y <= 0) {
                setTimeout(()=>{
                    io.to(socket.id).emit('rejectCmd', cmdId);
                }, lagSim);
                return;
            }

            let yMult = direction == 's' ? 1 : -1;
            destChunk = {
                x: data.chunk.x,
                y: (data.chunk.y + Math.floor((data.pos.y + yMult)/chunkH))
            }
            destPos = {
                x: data.pos.x,
                y: (data.pos.y + yMult + chunkH)%chunkH,
                z: data.z
            }

            players[session].facing = direction;
        }
        else if (direction == 'h') {
            destChunk = {
                x: data.chunk.x,
                y: data.chunk.y
            }
            destPos = {
                x: data.pos.x,
                y: data.pos.y,
                z: data.z
            }
        }

        if (!interactable.includes(world[destChunk.y][destChunk.x][destPos.y][destPos.x][destPos.z])) {
            setTimeout(()=>{
                io.to(socket.id).emit('rejectCmd', cmdId);
            }, lagSim);
            return;
        }

        interact(world[destChunk.y][destChunk.x][destPos.y][destPos.x][destPos.z], destChunk, destPos, socket, session, seed, cmdId);
        return;
    })

    socket.on('placeBlock', (session, blockId, itemId, cmdId) => {
        if (!(players[session].inv.hasOwnProperty(itemId) && players[session].inv[itemId] > 0)) {
            io.to(socket.id).emit('rejectCmd', cmdId);
        }
        placeBlock(session, blockId, cmdId);
    })

    socket.on('craft', (session, type, amount, cmdId) => {
        let R = {...baseRecipes};
        if (world[players[session].chunk.y][players[session].chunk.x][players[session].pos.y][players[session].pos.x][players[session].z] == B.SMELTER) {
            R = {...R, ...smelterRecipes};
        }
        if (!R.hasOwnProperty(type)) {
            io.to(socket.id).emit('rejectCmd', cmdId);
            return;
        }

        let possible = true;
        for (let part in R[type]) {
            if (players[session].inv[part] < R[type][part] * amount) {
                possible = false;
            }
        }

        if (possible) {
            for (let part in R[type]) {
                players[session].inv[part] -= R[type][part] * amount;
                if (players[session].inv[part] <= 0) {
                    delete players[session].inv[part];
                }
            }

            for (let x=0; x<amount; x++) {
                addToInv(session, type);
            }

            io.to(socket.id).emit('authCmd', cmdId);
            return;
        }
        else {
            io.to(socket.id).emit('rejectCmd', cmdId);
            return;
        }
    })

    socket.on('hold', (session, item, instance, cmdId) => {
        if (!players[session].inv.hasOwnProperty(item)) {
            io.to(socket.id).emit('rejectCmd', cmdId);
            return;
        }
        
        if (instance >= players[session].inv[item].instances) {
            io.to(socket.id).emit('rejectCmd', cmdId);
            return;
        }

        if (!unstack.includes(parseInt(item))) {
            io.to(socket.id).emit('rejectCmd', cmdId);
        }
        
        players[session].holding = {id: item, ins: instance};
        io.to(socket.id).emit('authCmd', cmdId);

        emitToAdjNoSender(players[session].chunk, 'newPlayer', [JSON.stringify(players[session])], socket);
    })

    socket.on('unhold', (session, item, instance, cmdId) => {
        if (!players[session].inv.hasOwnProperty(item)) {
            io.to(socket.id).emit('rejectCmd', cmdId);
            return;
        }
        
        if (instance >= players[session].inv[item].instances) {
            io.to(socket.id).emit('rejectCmd', cmdId);
            return;
        }

        if (players[session] === null || players[session].holding.id != item || players[session].holding.ins != instance) {
            io.to(socket.id).emit('rejectCmd', cmdId);
            return;
        }

        if (!unstack.includes(parseInt(item))) {
            io.to(socket.id).emit('rejectCmd', cmdId);
        }

        players[session].holding = null;
        io.to(socket.id).emit('authCmd', cmdId);

        emitToAdjNoSender(players[session].chunk, 'newPlayer', [JSON.stringify(players[session])], socket);
    })

    socket.on('use', (session, id, cmdId)=>{
        if (!placeable.some(x=>I[x] == id) && !usable.includes(id)) {
            io.to(socket.id).emit('rejectCmd', cmdId);
            return;
        }

        if (!players[session].inv.hasOwnProperty(id)) {
            io.to(socket.id).emit('rejectCmd', cmdId);
            return;
        }

        if (players[session].inv[id] <= 0) {
            io.to(socket.id).emit('rejectCmd', cmdId);
            return;
        }

        if (useEffect(session, id, cmdId)) {
            removeFromInv(session, id, null);
        }
        io.to(socket.id).emit('authCmd', cmdId);
        return;
    })

    socket.on('shootBow', (session, cmdId, seed) => {
        if ((Date.now() - players[session].lastAction) < toolCd[I.BOW] - 20) {
            io.to(socket.id).emit('rejectCmd', cmdId);
            return;
        }

        if (players[session].holding === null || players[session].holding.id != I.BOW) {
            io.to(socket.id).emit('rejectCmd', cmdId);
            return;
        }
        else {
            ins = players[session].holding.ins;
        }

        if (!players[session].inv.hasOwnProperty(I.BOW)) {
            io.to(socket.id).emit('rejectCmd', cmdId);
            return;
        }

        if (players[session].inv[I.BOW].instances <= ins || players[session].inv[I.BOW].duras[ins] <= 0) {
            io.to(socket.id).emit('rejectCmd', cmdId);
            return;
        }

        if (players[session].ammo === null || !arrow.includes(players[session].ammo) || !players[session].inv.hasOwnProperty(players[session].ammo)) {
            io.to(socket.id).emit('rejectCmd', cmdId);
            return;
        }

        players[session].inv[I.BOW].duras[ins]--;
        new Arrow({
            pos: {
                x: players[session].pos.x,
                y: players[session].pos.y,
                z: players[session].z
            },
            chunk: players[session].chunk,
            dir: players[session].facing,
            firedBy: session,
            dmg: dmg[players[session].ammo]
        })

        if (seed % 20 === 0) {
            removeFromInv(session, players[session].ammo, null);
            if (!players[session].inv.hasOwnProperty(players[session].ammo)) {
                players[session].ammo = null;
            }
        }

        io.to(socket.id).emit('authCmd', cmdId);
    })

    socket.on('ammo', (session, id, cmdId) => {
        if (!arrow.includes(id)) {
            io.to(socket.id).emit('rejectCmd', cmdId);
            return;
        }

        if (!players[session].inv.hasOwnProperty(id) || players[session].inv[id] <= 0) {
            io.to(socket.id).emit('rejectCmd', cmdId);
            return;
        }

        if (players[session].ammo == id) {
            players[session].ammo = null;
        }
        else {
            players[session].ammo = id;
        }
        io.to(socket.id).emit('authCmd', cmdId);
    })

    socket.on('disconnect', ()=>{
        let ses = reverseSockets[socket.id];
        let data = players[ses];
        if (data) {
            plRooms[data.chunk.y][data.chunk.x] = plRooms[data.chunk.y][data.chunk.x].filter(x=>x!=ses);
            
            delete players[ses];
        }
    })
})

function removeFromInv(session, item, ins) {
    if (ins === null) {
        if (players[session].inv.hasOwnProperty(item)) {
            if (players[session].inv[item] > 1) {
                players[session].inv[item]--;
            }
            else {
                delete players[session].inv[item];
            }
        }
    }
}

function placeBlock(session, blockId, cmdId) {
    let data = players[session];
    if (data.z > 4) {
        setTimeout(()=>{
            io.to(sockets[session].id).emit('rejectCmd', cmdId);
        }, lagSim);
        return;
    }

    if (world[data.chunk.y][data.chunk.x][data.pos.y][data.pos.x][data.z] !== null) {
        setTimeout(()=>{
            io.to(sockets[session].id).emit('rejectCmd', cmdId);
        }, lagSim);
        return;
    }

    world[data.chunk.y][data.chunk.x][data.pos.y][data.pos.x][data.z] = blockId;
    emitToAdjNoSender(data.chunk, 'blockChange', [JSON.stringify(data.chunk), JSON.stringify({x: data.pos.x, y: data.pos.y, z: data.z}), blockId], sockets[session]);
    while (world[data.chunk.y][data.chunk.x][data.pos.y][data.pos.x][players[session].z] !== null && players[session].z < 5) {
        players[session].z++;
    }
    emitToAdjNoSender(data.chunk, 'newPlayer', JSON.stringify(data), sockets[session]);
    io.to(sockets[session].id).emit('authCmd', cmdId);
}

function afterMovement(session, dir) {
    let currPos = players[session].pos;
    let currChunk = players[session].chunk;
    let toDelete = [];
    players[session].aggroed.forEach(n=>{
        if (npcObj.hasOwnProperty(n)) {
            npcObj[n].data.path.push(dir);
        }
        else {
            toDelete.push(n);
        }
    })
    players[session].aggroed = players[session].aggroed.filter(x=>!toDelete.includes(x));
    for (let x=1; x<7; x++) {
        let targetPos = {
            x: (currPos.x + x) % chunkW,
            y: currPos.y
        }
        let targetChunk = {
            x: currChunk.x + Math.floor((currPos.x + x) / chunkW),
            y: currChunk.y
        }
        if (targetChunk.x >= 0 && targetChunk.x < chunkX && targetChunk.y >= 0 && targetChunk.y < chunkY) {
            if (!passable.includes(world[targetChunk.y][targetChunk.x][targetPos.y][targetPos.x][1]) && world[targetChunk.y][targetChunk.x][targetPos.y][targetPos.x][1] !== null) {
                break;
            }
            npcs[targetChunk.y][targetChunk.x].forEach(n=>{
                if (n.data.pos.x == targetPos.x && n.data.pos.y == targetPos.y) {
                    if (n.aggroable) {
                        n.aggro(session, 'a', x);
                        if (!players[session].aggroed.includes(n.data.id)) {
                            players[session].aggroed.push(n.data.id);
                        }
                    }
                }
            })
        }
    }
    for (let x=1; x<7; x++) {
        let targetPos = {
            x: (currPos.x - x + chunkW) % chunkW,
            y: currPos.y
        }
        let targetChunk = {
            x: currChunk.x + Math.floor((currPos.x - x) / chunkW),
            y: currChunk.y
        }
        if (targetChunk.x >= 0 && targetChunk.x < chunkX && targetChunk.y >= 0 && targetChunk.y < chunkY) {
            if (!passable.includes(world[targetChunk.y][targetChunk.x][targetPos.y][targetPos.x][1]) && world[targetChunk.y][targetChunk.x][targetPos.y][targetPos.x][1] !== null) {
                break;
            }
            npcs[targetChunk.y][targetChunk.x].forEach(n=>{
                if (n.data.pos.x == targetPos.x && n.data.pos.y == targetPos.y) {
                    if (n.aggroable) {
                        n.aggro(session, 'd', x);
                        if (!players[session].aggroed.includes(n.data.id)) {
                            players[session].aggroed.push(n.data.id);
                        }
                    }
                }
            })
        }
    }
    for (let x=1; x<7; x++) {
        let targetPos = {
            x: currPos.x,
            y: (currPos.y - x + chunkH) % chunkH
        }
        let targetChunk = {
            x: currChunk.x,
            y: currChunk.y + Math.floor((currPos.y - x) / chunkH)
        }
        if (targetChunk.x >= 0 && targetChunk.x < chunkX && targetChunk.y >= 0 && targetChunk.y < chunkY) {
            if (!passable.includes(world[targetChunk.y][targetChunk.x][targetPos.y][targetPos.x][1]) && world[targetChunk.y][targetChunk.x][targetPos.y][targetPos.x][1] !== null) {
                break;
            }
            npcs[targetChunk.y][targetChunk.x].forEach(n=>{
                if (n.data.pos.x == targetPos.x && n.data.pos.y == targetPos.y) {
                    if (n.aggroable) {
                        n.aggro(session, 's', x);
                        if (!players[session].aggroed.includes(n.data.id)) {
                            players[session].aggroed.push(n.data.id);
                        }
                    }
                }
            })
        }
    }
    for (let x=1; x<7; x++) {
        let targetPos = {
            x: currPos.x,
            y: (currPos.y + x) % chunkH
        }
        let targetChunk = {
            x: currChunk.x,
            y: currChunk.y + Math.floor((currPos.y + x) / chunkH)
        }
        if (targetChunk.x >= 0 && targetChunk.x < chunkX && targetChunk.y >= 0 && targetChunk.y < chunkY) {
            if (!passable.includes(world[targetChunk.y][targetChunk.x][targetPos.y][targetPos.x][1]) && world[targetChunk.y][targetChunk.x][targetPos.y][targetPos.x][1] !== null) {
                break;
            }
            npcs[targetChunk.y][targetChunk.x].forEach(n=>{
                if (n.data.pos.x == targetPos.x && n.data.pos.y == targetPos.y) {
                    if (n.aggroable) {
                        n.aggro(session, 'w', x);
                        if (!players[session].aggroed.includes(n.data.id)) {
                            players[session].aggroed.push(n.data.id);
                        }
                    }
                }
            })
        }
    }
}

function interact(type, chunk, pos, socket, session, seed, cmdId) {
    if (requireAxe.includes(type)) {
        if (players[session].holding === null || !axe.includes(parseInt(players[session].holding.id))) {
            setTimeout(()=>{
                io.to(socket.id).emit('rejectCmd', cmdId);
            }, lagSim)
            return;
        }
        if (players[session].inv[players[session].holding.id].duras[players[session].holding.ins] < 1) {
            setTimeout(()=>{
                io.to(socket.id).emit('rejectCmd', cmdId);
            }, lagSim)
            return;
        }
        if ((Date.now() - players[session].lastAction) <= (toolCd[parseInt(players[session].holding.id)] - 10)) {
            setTimeout(()=>{
                io.to(socket.id).emit('rejectCmd', cmdId);
            }, lagSim)
            return;
        } 

        if (players[session].holding.id != I.WOODPICK && players[session].holding.id != I.WOODAXE) {
            players[session].inv[players[session].holding.id].duras[players[session].holding.ins]--;
        }

        players[session].lastAction = Date.now();
    }
    if (requirePickaxe.includes(type)) {
        if (players[session].holding === null || !pickaxe.includes(parseInt(players[session].holding.id))) {
            setTimeout(()=>{
                io.to(socket.id).emit('rejectCmd', cmdId);
            }, lagSim)
            return;
        }
        if (players[session].inv[players[session].holding.id].duras[players[session].holding.ins] < 1) {
            setTimeout(()=>{
                io.to(socket.id).emit('rejectCmd', cmdId);
            }, lagSim)
            return;
        }
        if ((Date.now() - players[session].lastAction) <= (toolCd[parseInt(players[session].holding.id)] - 10)) {
            setTimeout(()=>{
                io.to(socket.id).emit('rejectCmd', cmdId);
            }, lagSim)
            return;
        }
        
        if (players[session].holding.id != I.WOODPICK && players[session].holding.id != I.WOODAXE) {
            players[session].inv[players[session].holding.id].duras[players[session].holding.ins]--;
        }
        players[session].lastAction = Date.now();
    }

    setTimeout(()=>{
        io.to(socket.id).emit('authCmd', cmdId);
    }, lagSim)

    if (type == B.TOMATO2) {
        world[chunk.y][chunk.x][pos.y][pos.x][pos.z] = null;
        addToInv(session, I.TOMATO, null);
        addToInv(session, I.TOMATO, null);
        addToInv(session, I.TOMATOSEED, null);

        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), null], socket);
    }
    else if (type == B.TOMATO3) {
        world[chunk.y][chunk.x][pos.y][pos.x][pos.z] = null;
        for (let x=0; x<6; x++) {
            addToInv(session, I.TOMATO, null);
        }
        addToInv(session, I.TOMATOSEED, null);
        addToInv(session, I.TOMATOSEED, null);
        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), null], socket);
    }
    else if (type == B.WHEAT2) {
        world[chunk.y][chunk.x][pos.y][pos.x][pos.z] = null;
        for (let x=0; x<3; x++) {
            addToInv(session, I.WHEAT, null);
        }
        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), null], socket);
    }
    else if (type == B.WHEAT3) {
        world[chunk.y][chunk.x][pos.y][pos.x][pos.z] = null;
        for (let x=0; x<9; x++) {
            addToInv(session, I.WHEAT, null);
        }
        addToInv(session, I.WHEATSEED, null);
        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), null], socket);
    }
    else if (type == B.WHEAT4) {
        world[chunk.y][chunk.x][pos.y][pos.x][pos.z] = null;
        for (let x=0; x<20; x++) {
            addToInv(session, I.WHEAT, null);
        }
        addToInv(session, I.WHEATSEED, null);
        addToInv(session, I.WHEATSEED, null);
        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), null], socket);
    }
    else if (type == B.CARROT2) {
        world[chunk.y][chunk.x][pos.y][pos.x][pos.z] = null;
        for (let x=0; x<6; x++) {
            addToInv(session, I.CARROT, null);
        }
        addToInv(session, I.CARROTSEED, null);
        addToInv(session, I.CARROTSEED, null);
        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), null], socket);
    }
    else if (type == B.TREE) {
        world[chunk.y][chunk.x][pos.y][pos.x][pos.z] = B.TREE1; 
        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), B.TREE1], socket);
    }
    else if (type == B.TREE1) {
        world[chunk.y][chunk.x][pos.y][pos.x][pos.z] = B.TREE2; 
        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), B.TREE2], socket);
    }
    else if (type == B.TREE2) {
        world[chunk.y][chunk.x][pos.y][pos.x][pos.z] = B.TREE3; 
        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), B.TREE3], socket);
    }
    else if (type == B.TREE3) {
        world[chunk.y][chunk.x][pos.y][pos.x][pos.z] = B.STUMP; 
        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), B.STUMP], socket);
        addToInv(session, I.WOOD)
        setTimeout(()=>{
            emitToAdj(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), B.TREE]);
            world[chunk.y][chunk.x][pos.y][pos.x][pos.z] = B.TREE;
        }, treeRegrowTime)
        if (seed % 2 == 0) {
            addToInv(session, I.APPLE);
        }
        if (seed % 3 == 0) {
            addToInv(session, I.TOMATOSEED);
        }
    }
    else if (type == B.STONE) {
        world[chunk.y][chunk.x][pos.y][pos.x][pos.z] = B.STONE1; 
        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), B.STONE1], socket);
    }
    else if (type == B.STONE1) {
        world[chunk.y][chunk.x][pos.y][pos.x][pos.z] = B.STONE2; 
        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), B.STONE2], socket);
    }
    else if (type == B.STONE2) {
        world[chunk.y][chunk.x][pos.y][pos.x][pos.z] = B.STONE3; 
        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), B.STONE3], socket);
    }
    else if (type == B.STONE3) {
        world[chunk.y][chunk.x][pos.y][pos.x][pos.z] = B.STONEBASE; 
        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), B.STONEBASE], socket);
        addToInv(session, I.STONE);
        setTimeout(()=>{
            emitToAdj(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), B.STONE]);
            world[chunk.y][chunk.x][pos.y][pos.x][pos.z] = B.STONE;
        }, stoneRegrowTime)
    }

    else if (type == B.IRON) {
        world[chunk.y][chunk.x][pos.y][pos.x][pos.z] = B.IRON1; 
        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), B.IRON1], socket);
    }
    else if (type == B.IRON1) {
        world[chunk.y][chunk.x][pos.y][pos.x][pos.z] = B.IRON2; 
        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), B.IRON2], socket);
    }
    else if (type == B.IRON2) {
        world[chunk.y][chunk.x][pos.y][pos.x][pos.z] = B.IRON3; 
        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), B.IRON3], socket);
    }
    else if (type == B.IRON3) {
        world[chunk.y][chunk.x][pos.y][pos.x][pos.z] = B.IRONBASE; 
        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), B.IRONBASE], socket);
        addToInv(session, I.IRONORE);

        setTimeout(()=>{
            emitToAdj(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), B.IRON]);
            world[chunk.y][chunk.x][pos.y][pos.x][pos.z] = B.IRON;
        }, stoneRegrowTime)
    }
}

function useEffect(session, item, cmdId) {
    if (placeable.some(x=>I[x] == item)) {
        // placeBlock(session, item, cmdId);
        return true;
    }
    switch (item) {
        case I.APPLE:
            players[session].hp = Math.min(players[session].maxHp, players[session].hp + 10);
            emitToAdjNoSender(players[session].chunk, 'newPlayer', [JSON.stringify(players[session])], sockets[session]);
            return true;
        case I.TOMATOSEED: {
            let data = players[session];
            if (world[data.chunk.y][data.chunk.x][data.pos.y][data.pos.x][data.z - 1] == B.GRASS && world[data.chunk.y][data.chunk.x][data.pos.y][data.pos.x][data.z] === null) {
                world[data.chunk.y][data.chunk.x][data.pos.y][data.pos.x][data.z] = B.TOMATO1;
                emitToAdjNoSender(data.chunk, 'blockChange', [JSON.stringify(data.chunk), JSON.stringify({x: data.pos.x, y: data.pos.y, z: data.z}), B.TOMATO1], sockets[session]);
                let copyChunk = JSON.parse(JSON.stringify(data.chunk));
                let copyPos = JSON.parse(JSON.stringify(data.pos));

                cropHeartBeat[`${data.chunk.x}-${data.chunk.y}-${data.pos.x}-${data.pos.y}`] = setTimeout(()=>{
                    world[copyChunk.y][copyChunk.x][copyPos.y][copyPos.x][data.z] = B.TOMATO2;
                    emitToAdj(copyChunk, 'blockChange', [JSON.stringify(copyChunk), JSON.stringify({x: copyPos.x, y: copyPos.y, z: data.z}), B.TOMATO2]);
                }, cropStageTime)
                return true;
            }
            return false;
        }
        case I.WHEATSEED: {
            let data = players[session];
            if (world[data.chunk.y][data.chunk.x][data.pos.y][data.pos.x][data.z - 1] == B.GRASS && world[data.chunk.y][data.chunk.x][data.pos.y][data.pos.x][data.z] === null) {
                world[data.chunk.y][data.chunk.x][data.pos.y][data.pos.x][data.z] = B.WHEAT1;
                emitToAdjNoSender(data.chunk, 'blockChange', [JSON.stringify(data.chunk), JSON.stringify({x: data.pos.x, y: data.pos.y, z: data.z}), B.WHEAT1], sockets[session]);
                let copyChunk = JSON.parse(JSON.stringify(data.chunk));
                let copyPos = JSON.parse(JSON.stringify(data.pos));

                cropHeartBeat[`${data.chunk.x}-${data.chunk.y}-${data.pos.x}-${data.pos.y}`] = setTimeout(()=>{
                    world[copyChunk.y][copyChunk.x][copyPos.y][copyPos.x][data.z] = B.WHEAT2;
                    emitToAdj(copyChunk, 'blockChange', [JSON.stringify(copyChunk), JSON.stringify({x: copyPos.x, y: copyPos.y, z: data.z}), B.WHEAT2]);
                }, cropStageTime)
                return true;
            }
            return false;
        }
        case I.CARROTSEED: {
            let data = players[session];
            if (world[data.chunk.y][data.chunk.x][data.pos.y][data.pos.x][data.z - 1] == B.GRASS && world[data.chunk.y][data.chunk.x][data.pos.y][data.pos.x][data.z] === null) {
                world[data.chunk.y][data.chunk.x][data.pos.y][data.pos.x][data.z] = B.CARROT1;
                emitToAdjNoSender(data.chunk, 'blockChange', [JSON.stringify(data.chunk), JSON.stringify({x: data.pos.x, y: data.pos.y, z: data.z}), B.CARROT1], sockets[session]);
                let copyChunk = JSON.parse(JSON.stringify(data.chunk));
                let copyPos = JSON.parse(JSON.stringify(data.pos));

                cropHeartBeat[`${data.chunk.x}-${data.chunk.y}-${data.pos.x}-${data.pos.y}`] = setTimeout(()=>{
                    world[copyChunk.y][copyChunk.x][copyPos.y][copyPos.x][data.z] = B.CARROT2;
                    emitToAdj(copyChunk, 'blockChange', [JSON.stringify(copyChunk), JSON.stringify({x: copyPos.x, y: copyPos.y, z: data.z}), B.CARROT2]);
                }, cropStageTime)
                return true;
            }
            return false;
        }
        case I.WATERBUCKET: {
            let data = players[session];
            if (world[data.chunk.y][data.chunk.x][data.pos.y][data.pos.x][data.z] == B.TOMATO2) {
                // world[data.chunk.y][data.chunk.x][data.pos.y][data.pos.x][data.z] = B.TOMATO1;
                // emitToAdjNoSender(data.chunk, 'blockChange', [JSON.stringify(data.chunk), JSON.stringify({x: data.pos.x, y: data.pos.y, z: data.z}), B.TOMATO1], sockets[session]);
                let copyChunk = JSON.parse(JSON.stringify(data.chunk));
                let copyPos = JSON.parse(JSON.stringify(data.pos));

                cropHeartBeat[`${data.chunk.x}-${data.chunk.y}-${data.pos.x}-${data.pos.y}`] = setTimeout(()=>{
                    world[copyChunk.y][copyChunk.x][copyPos.y][copyPos.x][data.z] = B.TOMATO3;
                    emitToAdj(copyChunk, 'blockChange', [JSON.stringify(copyChunk), JSON.stringify({x: copyPos.x, y: copyPos.y, z: data.z}), B.TOMATO3]);
                }, cropStageTime)
            }
            else if (world[data.chunk.y][data.chunk.x][data.pos.y][data.pos.x][data.z] == B.WHEAT2) {
                // world[data.chunk.y][data.chunk.x][data.pos.y][data.pos.x][data.z] = B.TOMATO1;
                // emitToAdjNoSender(data.chunk, 'blockChange', [JSON.stringify(data.chunk), JSON.stringify({x: data.pos.x, y: data.pos.y, z: data.z}), B.TOMATO1], sockets[session]);
                let copyChunk = JSON.parse(JSON.stringify(data.chunk));
                let copyPos = JSON.parse(JSON.stringify(data.pos));

                cropHeartBeat[`${data.chunk.x}-${data.chunk.y}-${data.pos.x}-${data.pos.y}`] = setTimeout(()=>{
                    world[copyChunk.y][copyChunk.x][copyPos.y][copyPos.x][data.z] = B.WHEAT3;
                    emitToAdj(copyChunk, 'blockChange', [JSON.stringify(copyChunk), JSON.stringify({x: copyPos.x, y: copyPos.y, z: data.z}), B.WHEAT3]);
                }, cropStageTime)
            }
            else if (world[data.chunk.y][data.chunk.x][data.pos.y][data.pos.x][data.z] == B.WHEAT3) {
                // world[data.chunk.y][data.chunk.x][data.pos.y][data.pos.x][data.z] = B.TOMATO1;
                // emitToAdjNoSender(data.chunk, 'blockChange', [JSON.stringify(data.chunk), JSON.stringify({x: data.pos.x, y: data.pos.y, z: data.z}), B.TOMATO1], sockets[session]);
                let copyChunk = JSON.parse(JSON.stringify(data.chunk));
                let copyPos = JSON.parse(JSON.stringify(data.pos));

                cropHeartBeat[`${data.chunk.x}-${data.chunk.y}-${data.pos.x}-${data.pos.y}`] = setTimeout(()=>{
                    world[copyChunk.y][copyChunk.x][copyPos.y][copyPos.x][data.z] = B.WHEAT4;
                    emitToAdj(copyChunk, 'blockChange', [JSON.stringify(copyChunk), JSON.stringify({x: copyPos.x, y: copyPos.y, z: data.z}), B.WHEAT4]);
                }, cropStageTime)
            }
            return false;
        }
    }
}

function addToInv(ses, item, dura) {
    if (!unstack.includes(item)) {
        if (players[ses].inv.hasOwnProperty(item)) {
            players[ses].inv[item]++;
        }
        else {
            players[ses].inv[item] = 1;
        }
    }
    else {
        if (players[ses].inv.hasOwnProperty(item)) {
            players[ses].inv[item].instance++;
            players[ses].inv[item].duras.push(dura);
        }
        else {
            players[ses].inv[item] = {
                instance: 1,
                duras: [dura]
            }
        }
    }
}

let nextNpcId = 0;

class GenNpc {
    constructor(arg) {
        this.data = arg;
        npcs[arg.chunk.y][arg.chunk.x].push(this);
        // this.data.faceLeft = true;
        this.data.id = nextNpcId++;
        
        npcObj[this.data.id] = this;
    }
    afterSpawn() {
        emitToAdj(this.data.chunk, 'npcData', [JSON.stringify(this.data)]);
    }
    teleport(cx, cy, x, y) {
        let oriChunk = {x: this.data.chunk.x, y: this.data.chunk.y}
        this.data.chunk = {x: cx, y: cy};
        this.data.pos = {x: x, y: y};

        if (oriChunk.x != cx || oriChunk.y != cy) {
            emitToAdj(oriChunk, 'npcData', [JSON.stringify(this.data)]);
        }
        emitToAdj(this.data.chunk, 'npcData', [JSON.stringify(this.data)]);
    }
    move(dir, cbs = {}) {
        let destChunk, destPos;
        let oriChunk = {
            x: this.data.chunk.x,
            y: this.data.chunk.y
        }
        if (dir == 'd' || dir == 'a') {
            let multiplier = dir == 'd' ? 1 : -1;
                
            destChunk = {
                x: this.data.chunk.x + Math.floor((this.data.pos.x + multiplier)/chunkW),
                y: this.data.chunk.y
            }
            destPos = {
                x: (this.data.pos.x + multiplier + chunkW)%chunkW,
                y: this.data.pos.y,
                z: this.data.pos.z
            }

            if (destChunk.x < 0 || destChunk.x > chunkX - 1) {
                if (cbs.collideEdge) cbs.collideEdge(dir);
                return;
            }
        }
        else if (dir == 'w' || dir == 's') {
            let multiplier = dir == 's' ? 1 : -1;
            
            destChunk = {
                x: this.data.chunk.x,
                y: this.data.chunk.y + Math.floor((this.data.pos.y + multiplier)/chunkH)
            }
            destPos = {
                x: this.data.pos.x,
                y: (this.data.pos.y + multiplier + chunkH)%chunkH,
                z: this.data.pos.z
            }

            if (destChunk.y < 0 || destChunk.y > chunkY - 1) {
                if (cbs.collideEdge) cbs.collideEdge(dir);
                return;
            }
        }

        if (!passable.includes(world[destChunk.y][destChunk.x][destPos.y][destPos.x][destPos.z]) && world[destChunk.y][destChunk.x][destPos.y][destPos.x][destPos.z] !== null) {
            if (cbs.collideBlock) cbs.collideBlock(destChunk, destPos);
            return;
        }

        let plInDest = false;
        plRooms[destChunk.y][destChunk.x].forEach(p=>{
            let d = players[p];
            if (d.pos.x == destPos.x && d.pos.y == destPos.y && d.z == destPos.z) {
                plInDest = true;
                if (cbs.collidePlayer) cbs.collidePlayer(p, dir, destChunk, destPos);
            }
        })

        if (plInDest) return;

        let npcInDest = false;
        let targetNpc = null
        npcs[destChunk.y][destChunk.x].forEach(n=>{
            if (n.data.pos.x == destPos.x && n.data.pos.y == destPos.y && n.data.pos.z == destPos.z) {
                npcInDest = true;
                targetNpc = n
            }
        })

        if (npcInDest) {
            if (targetNpc.pathStopping) {
                this.data.path = [];
                if (this.aggroable) {
                    if (this.target !== null) {
                        players[this.data.target].aggroed = players[this.data.target].aggroed.filter(x=>npcObj[x].data.id != this.data.id)
                        this.target = null;
                    }
                }
            }

            if (cbs.collideNpc) cbs.collideNpc(targetNpc);

            return;
        }

        this.data.chunk = destChunk;
        this.data.pos = destPos;
        if (this.data.fourDir) {
            this.data.facing = dir;
        }
        else {
            if (dir == 'a') this.data.faceLeft = true;
            if (dir == 'd') this.data.faceLeft = false;
        }

        if (destChunk.x != oriChunk.x || destChunk.y != oriChunk.y) {
            npcs[oriChunk.y][oriChunk.x] = npcs[oriChunk.y][oriChunk.x].filter(n=>n.id!=this.id);
            npcs[this.data.chunk.y][this.data.chunk.x].push(this);
            emitToAdj(oriChunk, 'npcData', [JSON.stringify(this.data)]);
        }

        emitToAdj(this.data.chunk, 'npcData', [JSON.stringify(this.data)]);

        if (this.aggroable) {
            let currPos = this.data.pos;
            let currChunk = this.data.chunk;
            for (let x=1; x<7; x++) {
                let targetPos = {
                    x: (currPos.x + x) % chunkW,
                    y: currPos.y
                }
                let targetChunk = {
                    x: currChunk.x + Math.floor((currPos.x + x) / chunkW),
                    y: currChunk.y
                }
                if (targetChunk.x >= 0 && targetChunk.x < chunkX && targetChunk.y >= 0 && targetChunk.y < chunkY) {
                    if (!passable.includes(world[targetChunk.y][targetChunk.x][targetPos.y][targetPos.x][1]) && world[targetChunk.y][targetChunk.x][targetPos.y][targetPos.x][1] !== null) {
                        break;
                    }
                    plRooms[targetChunk.y][targetChunk.x].forEach(p=>{
                        if (players[p].pos.x == targetPos.x && players[p].pos.y == targetPos.y) {
                            this.aggro(p, 'd', x);
                            if (!players[p].aggroed.includes(this.data.id)) {
                                players[p].aggroed.push(this.data.id);
                            }
                        }
                    })
                }
            }
            for (let x=1; x<7; x++) {
                let targetPos = {
                    x: (currPos.x - x + chunkW) % chunkW,
                    y: currPos.y
                }
                let targetChunk = {
                    x: currChunk.x + Math.floor((currPos.x - x) / chunkW),
                    y: currChunk.y
                }
                if (targetChunk.x >= 0 && targetChunk.x < chunkX && targetChunk.y >= 0 && targetChunk.y < chunkY) {
                    if (!passable.includes(world[targetChunk.y][targetChunk.x][targetPos.y][targetPos.x][1]) && world[targetChunk.y][targetChunk.x][targetPos.y][targetPos.x][1] !== null) {
                        break;
                    }
                    plRooms[targetChunk.y][targetChunk.x].forEach(p=>{
                        if (players[p].pos.x == targetPos.x && players[p].pos.y == targetPos.y) {
                            this.aggro(p, 'a', x);
                            if (!players[p].aggroed.includes(this.data.id)) {
                                players[p].aggroed.push(this.data.id);
                            }
                        }
                    })
                }
            }
            for (let x=1; x<7; x++) {
                let targetPos = {
                    x: currPos.x,
                    y: (currPos.y - x + chunkH) % chunkH
                }
                let targetChunk = {
                    x: currChunk.x,
                    y: currChunk.y + Math.floor((currPos.y - x) / chunkH)
                }
                if (targetChunk.x >= 0 && targetChunk.x < chunkX && targetChunk.y >= 0 && targetChunk.y < chunkY) {
                    if (!passable.includes(world[targetChunk.y][targetChunk.x][targetPos.y][targetPos.x][1]) && world[targetChunk.y][targetChunk.x][targetPos.y][targetPos.x][1] !== null) {
                        break;
                    }
                    plRooms[targetChunk.y][targetChunk.x].forEach(p=>{
                        if (players[p].pos.x == targetPos.x && players[p].pos.y == targetPos.y) {
                            this.aggro(p, 'w', x);
                            if (!players[p].aggroed.includes(this.data.id)) {
                                players[p].aggroed.push(this.data.id);
                            }
                        }
                    })
                }
            }
            for (let x=1; x<7; x++) {
                let targetPos = {
                    x: currPos.x,
                    y: (currPos.y + x) % chunkH
                }
                let targetChunk = {
                    x: currChunk.x,
                    y: currChunk.y + Math.floor((currPos.y + x) / chunkH)
                }
                if (targetChunk.x >= 0 && targetChunk.x < chunkX && targetChunk.y >= 0 && targetChunk.y < chunkY) {
                    if (!passable.includes(world[targetChunk.y][targetChunk.x][targetPos.y][targetPos.x][1]) && world[targetChunk.y][targetChunk.x][targetPos.y][targetPos.x][1] !== null) {
                        break;
                    }
                    plRooms[targetChunk.y][targetChunk.x].forEach(p=>{
                        if (players[p].pos.x == targetPos.x && players[p].pos.y == targetPos.y) {
                            this.aggro(p, 's', x);
                            if (!players[p].aggroed.includes(this.data.id)) {
                                players[p].aggroed.push(this.data.id);
                            }
                        }
                    })
                }
            }
        }

        if (this.afterMovement) this.afterMovement();
    }
    die(session = null) {
        npcs[this.data.chunk.y][this.data.chunk.x] = npcs[this.data.chunk.y][this.data.chunk.x].filter(n=>n.data.id != this.data.id);
        emitToAdj(this.data.chunk, 'npcDie', [this.data.id]);

        if (this.aggroable && this.data.target) {
            players[this.data.target].aggroed = players[this.data.target].aggroed.filter(x=>x != this.data.id);
        }

        clearInterval(this.heartBeat);
        delete npcObj[this.data.id];

        if (this.afterDeath) this.afterDeath(session);
    }
}

class Arrow extends GenNpc {
    static lifeSpan = 5;
    constructor (arg) {
        super(arg);
        this.heartBeat = setInterval(()=>{
            this.move(this.data.dir, {
                collideEdge: () => {
                    this.die();
                },
                collideBlock: () => {
                    this.die();
                },
                collidePlayer: () => {
                    this.die();
                },
                collideNpc: (n) => {
                    n.damage(this.data.firedBy, this.data.dmg);
                    this.die();
                }
            });
        }, 100)
        this.aggroable = false;
        this.data.fourDir = true;
        this.data.sprite = [
            [256, 240],
            [208, 240],
            [240, 240],
            [224, 240]
        ]
        this.travelled = 0;
        this.pathStopping = false; // stopping short range npc

        this.afterSpawn();
    }
    afterMovement() {
        this.travelled ++;
        if (this.travelled > Arrow.lifeSpan) {
            this.die();
        }
    }
}

class CloseRangeNpc extends GenNpc{
    static maxPathLength = 20;
    constructor (arg) {
        super(arg);
        this.data.hp = 100;
        this.data.maxHp = 100;
        this.data.target = null;
        this.data.path = [];
        this.heartBeat = setInterval(()=>{
            if (this.data.path.length > CloseRangeNpc.maxPathLength) {
                this.data.path = [];
                players[this.data.target].aggroed = players[this.data.target].aggroed.filter(x=>npcObj[x].data.id != this.data.id)
                this.target = null;
            }
            if (this.data.path.length > 0) {
                let next = this.data.path.shift();
                this.move(next, {
                    collidePlayer: (p, dir, destChunk, destPos)=>{
                        players[p].hp -= 10;
                        players[p].hp = Math.max(players[p].hp, 0);

                        this.data.path.push(dir);

                        emitToAdj(destChunk, 'newPlayer', [JSON.stringify(players[p])]);
                        io.to(sockets[p].id).emit('fakePlProp', 'hp', players[p].hp);
                    }
                })
            }
        }, 1000);
        this.data.fourDir = false;
        this.data.faceLeft = true;
    }
    damage(session, dmg) {
        this.data.hp -= dmg;
        this.data.hp = Math.max(this.data.hp, 0);

        if (this.data.hp <= 0) {
            this.die(session);
            clearInterval(this.heartBeat);
            return;
        }

        emitToAdj(this.data.chunk, 'npcData', [JSON.stringify(this.data)]);
    }
    afterDeath(session) {
        addToInv(session, I.APPLE, null);
        io.to(sockets[session].id).emit('fakePlAddToInv', I.APPLE);

        new Goblin({
            chunk: {
                x: 0,
                y: 0
            },
            pos: {
                x: 8,
                y: 4,
                z: 1
            }
        })
    }
    aggro(session, dir, times) {
        this.data.target = session;
        this.data.path = [];
        this.data.path = Array(times).fill(dir);
    }
}

class Goblin extends CloseRangeNpc{
    constructor (arg) {
        super(arg);
        this.data.sprite = [
            [80, 32],
            [80, 16]
        ];
        this.aggroable = true;

        this.afterSpawn();
    }
}

new Goblin({
    chunk: {
        x: 0,
        y: 0
    },
    pos: {
        x: 8,
        y: 2,
        z: 1
    }
})

// new CloseRangeNpc({
//     chunk: {
//         x: 0,
//         y: 0
//     },
//     pos: {
//         x: 5,
//         y: 2
//     }
// })