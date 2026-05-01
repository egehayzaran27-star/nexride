const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../sqlite.db');
const db = new Database(dbPath);

const admins = ['egehayzaran27@gmail.com', 'sıdkıhayzaran@gmail.com'];

admins.forEach(email => {
    const result = db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(email);
    console.log(`User ${email} updated:`, result.changes);
});

db.close();
