/**
 * Migration: Add 'superadmin' user type to existing database
 * 
 * SQLite does not support ALTER TABLE ... MODIFY COLUMN, so we must
 * recreate the users table with the updated CHECK constraint.
 * 
 * Run ONCE on an existing database with: node migrate_add_superadmin.js
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = process.env.DB_PATH || 'database.sqlite';
const db = new Database(path.join(__dirname, dbPath));

db.pragma('foreign_keys = OFF');
db.pragma('journal_mode = WAL');

const migrate = db.transaction(() => {
  console.log('Starting superadmin migration...');

  // 1. Check if superadmin type is already allowed by trying a dry-run insert
  //    (we detect by checking if the CHECK constraint already includes superadmin)
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (tableInfo && tableInfo.sql.includes("'superadmin'")) {
    console.log('✓ users table already has superadmin in CHECK constraint. Skipping table recreation.');
  } else {
    console.log('Recreating users table with superadmin type support...');

    // 2. Rename existing table
    db.exec('ALTER TABLE users RENAME TO users_old');

    // 3. Create new table with updated CHECK constraint
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('admin', 'manager', 'user', 'guest', 'superadmin')) DEFAULT 'guest',
        name TEXT NOT NULL,
        surname TEXT NOT NULL,
        role TEXT,
        organization TEXT,
        city TEXT,
        country TEXT,
        gender TEXT CHECK(gender IN ('female', 'male', 'non binary', 'other', 'prefer not to say')),
        image TEXT,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        creation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        company_id INTEGER,
        FOREIGN KEY(company_id) REFERENCES company(id)
      )
    `);

    // 4. Copy data
    db.exec(`
      INSERT INTO users (id, type, name, surname, role, organization, city, country, gender, image, email, password, creation_date, company_id)
      SELECT id, type, name, surname, role, organization, city, country, gender, image, email, password, creation_date, company_id
      FROM users_old
    `);

    // 5. Drop old table
    db.exec('DROP TABLE users_old');

    // 6. Recreate the unique index
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_one_admin_per_company ON users (company_id) WHERE type = 'admin'
    `);

    console.log('✓ users table recreated successfully.');
  }

  // 7. Seed superadmin if not present
  const existing = db.prepare("SELECT id FROM users WHERE type = 'superadmin'").get();
  if (!existing) {
    const hashedPassword = bcrypt.hashSync('superadmin', 10);
    db.prepare(
      'INSERT INTO users (name, surname, email, password, type, company_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('Super', 'Admin', 'superadmin@example.com', hashedPassword, 'superadmin', null);
    console.log('✓ Superadmin seeded: superadmin@example.com / superadmin');
  } else {
    console.log('✓ Superadmin already exists. Skipping seed.');
  }

  console.log('Migration complete!');
});

try {
  migrate();
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  db.pragma('foreign_keys = ON');
  db.close();
}
