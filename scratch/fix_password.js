const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '..', 'sqlite.db');
const db = new Database(dbPath);

const email = 'egehayzaran27@gmail.com';
const plainPassword = 'ehay2010.';

async function updatePassword() {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    const update = db.prepare('UPDATE users SET password = ? WHERE email = ?');
    const result = update.run(hashedPassword, email);

    if (result.changes > 0) {
        console.log('Password updated successfully for ' + email);
    } else {
        console.log('User not found or update failed.');
    }

    db.close();
}

updatePassword();
