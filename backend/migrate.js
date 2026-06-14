const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || 'database.sqlite';
const db = new Database(path.join(__dirname, dbPath));

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Running migration...');

try {
  // Create fields table
  db.exec(`
    CREATE TABLE IF NOT EXISTS fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      field_name TEXT NOT NULL,
      field_type TEXT NOT NULL CHECK(field_type IN ('text', 'number', 'yes/no', 'options')),
      field_values TEXT,
      field_order INTEGER DEFAULT 0,
      required BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
      UNIQUE(event_id, field_name)
    );
  `)
  console.log('✓ fields table created');

  // Create guestdata table
  db.exec(`
    CREATE TABLE IF NOT EXISTS guestdata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id INTEGER NOT NULL,
      field_id INTEGER NOT NULL,
      field_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(guest_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(field_id) REFERENCES fields(id) ON DELETE CASCADE,
      UNIQUE(guest_id, field_id)
    );
  `);
  console.log('✓ guestdata table created');

  console.log('\n✅ Migration completed successfully!');
  process.exit(0);
} catch (err) {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
}
