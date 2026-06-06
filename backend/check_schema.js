const Database = require('better-sqlite3');
const db = new Database('database.sqlite');
const schema = db.prepare("SELECT sql FROM sqlite_master").all();
console.log(JSON.stringify(schema, null, 2));
db.close();
