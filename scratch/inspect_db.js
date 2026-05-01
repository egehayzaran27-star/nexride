const Database = require('better-sqlite3');
const path = require('path');
const db = new Database('sqlite.db');

console.log('--- USERS ---');
console.log(db.prepare('SELECT id, firstName, email, role FROM users').all());

console.log('--- DRIVERS ---');
console.log(db.prepare('SELECT * FROM drivers').all());
