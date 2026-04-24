const Database = require('better-sqlite3');
const db = new Database('sqlite.db');
const result = db.prepare("UPDATE bookings SET price = 50.0 WHERE (price = 0 OR price IS NULL) AND status = 'Bekliyor'").run();
console.log(`Updated ${result.changes} bookings.`);
