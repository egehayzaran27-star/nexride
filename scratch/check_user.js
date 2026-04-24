const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, '..', 'sqlite.db');
const db = new Database(dbPath);

const email = 'egehayzaran27@gmail.com';
const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

if (user) {
    console.log('User found:');
    console.log(JSON.stringify(user, null, 2));
} else {
    console.log('User NOT found with email: ' + email);
}

db.close();
