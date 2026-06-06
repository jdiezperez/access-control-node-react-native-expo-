const Database = require('better-sqlite3');
const db = new Database('database.sqlite');

try {
    console.log('Fixing events_sponsors table...');
    
    // 1. Rename existing table to a backup
    db.exec('ALTER TABLE events_sponsors RENAME TO events_sponsors_backup');
    
    // 2. Create the new table with correct foreign key
    db.exec(`
        CREATE TABLE events_sponsors (
            event_id INTEGER,
            sponsor_id INTEGER,
            creation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
            FOREIGN KEY(sponsor_id) REFERENCES sponsors(id) ON DELETE CASCADE,
            PRIMARY KEY(event_id, sponsor_id)
        )
    `);
    
    // 3. Copy data from backup (only if columns match)
    db.exec('INSERT INTO events_sponsors (event_id, sponsor_id, creation_date) SELECT event_id, sponsor_id, creation_date FROM events_sponsors_backup');
    
    // 4. Drop backup
    db.exec('DROP TABLE events_sponsors_backup');
    
    console.log('Successfully fixed events_sponsors table.');
} catch (err) {
    console.error('Error fixing table:', err.message);
    // Try to rollback if possible by renaming back if backup exists
    try {
        db.exec('ALTER TABLE events_sponsors_backup RENAME TO events_sponsors');
    } catch (e) {}
}

db.close();
