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
                world[y][x][a].push(`${x}${y}${a}${b}`);
            }
        }
    }
}

io.on('connection', ()=>{
    console.log('connection');
})

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
                        x: 1,
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
                players[ses] = data;

                let initMapData = [
                    data.chunk.x == 0 || data.chunk.y == 0 ? null : world[data.chunk.y-1][data.chunk.x-1],        data.chunk.y == 0 ? null : world[data.chunk.y-1][data.chunk.x],        data.chunk.x == chunkX-1 || data.chunk.y == 0 ? null : world[data.chunk.y-1][data.chunk.x+1],
                    data.chunk.x == 0 ? null : world[data.chunk.y][data.chunk.x-1],                               world[data.chunk.y][data.chunk.x],                                     data.chunk.x == chunkX-1 ? null : world[data.chunk.y][data.chunk.x+1],
                    data.chunk.x == 0 || data.chunk.y == chunkY-1 ? null : world[data.chunk.y+1][data.chunk.x-1], data.chunk.y == chunkY-1 ? null : world[data.chunk.y+1][data.chunk.x], data.chunk.x == chunkX-1 || data.chunk.y == chunkY-1 ? null : world[data.chunk.y+1][data.chunk.x+1]
                ]
                // console.log(players);

                res.send(`${ses.toString()}-${JSON.stringify(data)}-${JSON.stringify(initMapData)}`);
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
