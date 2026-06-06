const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'database.sqlite'));

try {
    db.exec('ALTER TABLE sponsors ADD COLUMN contact_phone TEXT');
    console.log('Added contact_phone column to sponsors table successfully.');
} catch (err) {
    if (err.message.includes('duplicate column name')) {
        console.log('Column contact_phone already exists.');
    } else {
        console.error('Error adding column:', err.message);
    }
}
db.close();
