const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db', sqlite3.OPEN_READWRITE);

db.run('DROP TABLE IF EXISTS accData');
db.run('DROP TABLE IF EXISTS playerData');