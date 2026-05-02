const Database = require('better-sqlite3');
const path = require('path');

['sqlite.db', 'database.db'].forEach(file => {
    try {
        const dbPath = path.resolve(__dirname, '..', file);
        const db = new Database(dbPath);
        console.log(`--- Tables in ${file} ---`);
        console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());
        db.close();
    } catch (e) {
        console.log(`Error reading ${file}: ${e.message}`);
    }
});
