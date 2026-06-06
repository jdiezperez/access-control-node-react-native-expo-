const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'database.sqlite'));

try {
    console.log('Migrating company table...');
    
    // 1. Rename existing table
    db.exec('ALTER TABLE company RENAME TO company_old');
    
    // 2. Create new table
    db.exec(`
      CREATE TABLE company (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        logo TEXT,
        address TEXT,
        email TEXT,
        phone TEXT
      )
    `);
    
    // 3. Copy data (excluding tagline)
    db.exec('INSERT INTO company (id, name, logo, address) SELECT id, name, logo, address FROM company_old');
    
    // 4. Drop old table
    db.exec('DROP TABLE company_old');
    
    console.log('Successfully migrated company table.');
} catch (err) {
    console.error('Error migrating company table:', err.message);
}

db.close();
