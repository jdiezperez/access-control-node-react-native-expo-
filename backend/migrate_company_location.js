const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'database.sqlite'));

try {
    console.log('Adding city and country columns to company table...');
    db.exec('ALTER TABLE company ADD COLUMN city TEXT');
    db.exec('ALTER TABLE company ADD COLUMN country TEXT');
    console.log('Successfully updated company table.');
} catch (err) {
    console.error('Error updating company table:', err.message);
}

db.close();
