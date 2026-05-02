const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, '..', 'sqlite.db');
const db = new Database(dbPath);

const users = db.prepare('SELECT id, firstName, lastName, email, role FROM users WHERE firstName = ? AND lastName = ?').all('Ege', 'Hayzaran');
const drivers = db.prepare('SELECT id, name, userId FROM drivers WHERE name LIKE ?').all('%Ege Hayzaran%');

console.log('--- USERS ---');
console.table(users);
console.log('--- DRIVERS ---');
console.table(drivers);

db.close();
