const express = require('express');

const app = express();
app.use(express.static('static'));

let bodyParser = require('body-parser');
let jsonParser = bodyParser.json();

const server = require('http').createServer(app);
const io = require('socket.io')(server);

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db', sqlite3.OPEN_READWRITE);

const B = require('./blockIds.js');

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

const interactable = [B.TREE, B.TREE1, B.TREE2, B.TREE3];
const passable = [B.GRASS, B.STUMP];

// ! testing use
let lagSim = 0;

// db.run(`INSERT INTO accData (user, pass) VALUES ('n1', 'p1')`)

// world[chunkY][chunkX][y][x]
let players = {};
let world = [];
let chunkX = 16;
let chunkY = 24;
let chunkW = 50;
let chunkH = 25;

// client has a copy, for read only
let baseMap = [];
for (let y=0; y<chunkY; y++) {
    baseMap.push([]);
    for (let x=0; x<chunkX; x++) {
        baseMap[y].push([]);
        for (let a=0; a<chunkH; a++) {
            baseMap[y][x].push([]);
            for (let b=0; b<chunkW; b++) {
                baseMap[y][x][a].push(B.GRASS);
            }
        }
    }
}

for (let y=0; y<chunkY; y++) {
    world.push([]);
    for (let x=0; x<chunkX; x++) {
        world[y].push([]);
        for (let a=0; a<chunkH; a++) {
            world[y][x].push([]);
            for (let b=0; b<chunkW; b++) {
                world[y][x][a].push((a+b)%4 ? null : B.TREE);
            }
        }
    }
}

// ! testing use
world[0][0][8][8] = B.TREE;

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
                        y: 0
                    },
                    pos:{
                        x: 4,
                        y: 4
                    },
                    inv: {}
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
                let initChunk = [0, 0]; // x, y
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

    socket.on('movement', (session, direction, cmdId) => {
        if (direction == 'd' || direction == 'a') {
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
                y: players[session].pos.y
            }
            // check if there is player in dest
            if (plRooms[destChunk.y][destChunk.x].some(p=>players[p].pos.x==destPos.x && players[p].pos.y==destPos.y)) {
                setTimeout(()=>{
                    io.to(socket.id).emit('rejectCmd', cmdId);
                }, lagSim);
                return;
            }

            if (!passable.includes(baseMap[destChunk.y][destChunk.x][destPos.y][destPos.x])) {
                setTimeout(()=>{
                    io.to(socket.id).emit('rejectCmd', cmdId);
                }, lagSim);
                return;
            }

            if (world[destChunk.y][destChunk.x][destPos.y][destPos.x] !== null && (!passable.includes(world[destChunk.y][destChunk.x][destPos.y][destPos.x]))) {
                setTimeout(()=>{
                    io.to(socket.id).emit('rejectCmd', cmdId);
                }, lagSim);
                return;
            }

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
                        }
                    })
                })

                // pm new map data, new player data
                setTimeout(()=>{
                    io.to(sockets[session].id).emit('newMapData', JSON.stringify(newMapData));
                    io.to(sockets[session].id).emit('newPlayerData', JSON.stringify(newPlayerData));
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

            // console.log(players[session]);
        }
        else if (direction == 's' || direction == 'w') {
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
                y: (players[session].pos.y + multiplier + chunkH)%chunkH
            }
            // check if there is player in dest
            if (plRooms[destChunk.y][destChunk.x].some(p=>players[p].pos.x==destPos.x && players[p].pos.y==destPos.y)) {
                setTimeout(()=>{
                    io.to(socket.id).emit('rejectCmd', cmdId);
                }, lagSim);
                return;
            }

            if (!passable.includes(baseMap[destChunk.y][destChunk.x][destPos.y][destPos.x])) {
                setTimeout(()=>{
                    io.to(socket.id).emit('rejectCmd', cmdId);
                }, lagSim);
                return;
            }

            if (world[destChunk.y][destChunk.x][destPos.y][destPos.x] !== null && (!passable.includes(world[destChunk.y][destChunk.x][destPos.y][destPos.x]))) {
                setTimeout(()=>{
                    io.to(socket.id).emit('rejectCmd', cmdId);
                }, lagSim);
                return;
            }

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
                        }
                    })
                })

                // pm new map data, new player data
                setTimeout(()=>{
                    io.to(sockets[session].id).emit('newMapData', JSON.stringify(newMapData));
                    io.to(sockets[session].id).emit('newPlayerData', JSON.stringify(newPlayerData));
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

            // console.log(players[session]);
        }
    })

    socket.on('interact', (session, direction, cmdId) => {
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
                y: data.pos.y
            }
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
                y: (data.pos.y + yMult + chunkH)%chunkH
            }
        }

        if (!interactable.includes(world[destChunk.y][destChunk.x][destPos.y][destPos.x])) {
            setTimeout(()=>{
                io.to(socket.id).emit('rejectCmd', cmdId);
            }, lagSim);
            return;
        }

        interact(world[destChunk.y][destChunk.x][destPos.y][destPos.x], destChunk, destPos, socket);
        setTimeout(()=>{
            io.to(socket.id).emit('authCmd', cmdId);
        }, lagSim)
        return;
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

function interact(type, chunk, pos, socket) {
    if (type == B.TREE) {
        world[chunk.y][chunk.x][pos.y][pos.x] = B.TREE1; 
        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), B.TREE1], socket);
    }
    else if (type == B.TREE1) {
        world[chunk.y][chunk.x][pos.y][pos.x] = B.TREE2; 
        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), B.TREE2], socket);
    }
    else if (type == B.TREE2) {
        world[chunk.y][chunk.x][pos.y][pos.x] = B.TREE3; 
        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), B.TREE3], socket);
    }
    else if (type == B.TREE3) {
        world[chunk.y][chunk.x][pos.y][pos.x] = B.STUMP; 
        emitToAdjNoSender(chunk, 'blockChange', [JSON.stringify(chunk), JSON.stringify(pos), B.STUMP], socket);
    }
}