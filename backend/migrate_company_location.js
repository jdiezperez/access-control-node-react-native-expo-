const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'database.sqlite'));

try {
    console.log('Adding city and country columns to companies table...');
    db.exec('ALTER TABLE companies ADD COLUMN city TEXT');
    db.exec('ALTER TABLE companies ADD COLUMN country TEXT');
    console.log('Successfully updated companies table.');
} catch (err) {
    console.error('Error updating companies table:', err.message);
}

db.close();
