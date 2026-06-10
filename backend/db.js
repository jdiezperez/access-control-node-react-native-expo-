const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || 'database.sqlite';
const db = new Database(path.join(__dirname, dbPath));

// Enable foreign keys
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS company (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    logo TEXT,
    address TEXT,
    email TEXT,
    phone TEXT,
    city TEXT,
    country TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('admin', 'manager', 'user', 'guest')) DEFAULT 'guest',
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
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_one_admin_per_company ON users (company_id) WHERE type = 'admin';

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    city TEXT,
    country TEXT,
    date DATETIME,
    email_template TEXT,
    logo TEXT,
    status TEXT DEFAULT 'not active' CHECK(status IN ('not active', 'active', 'completed')),
    creation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    company_id INTEGER,
    FOREIGN KEY(company_id) REFERENCES company(id)
  );

  CREATE TABLE IF NOT EXISTS sponsors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    logo TEXT,
    url TEXT,
    contact TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    country TEXT,
    company_id INTEGER,
    FOREIGN KEY(company_id) REFERENCES company(id)
  );

  CREATE TABLE IF NOT EXISTS events_sponsors (
    event_id INTEGER,
    sponsor_id INTEGER,
    creation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY(sponsor_id) REFERENCES sponsors(id) ON DELETE CASCADE,
    PRIMARY KEY(event_id, sponsor_id)
  );

  CREATE TABLE IF NOT EXISTS events_guests (
    user_id INTEGER,
    event_id INTEGER,
    invited BOOLEAN DEFAULT 0,
    invited_date DATETIME,
    accepted BOOLEAN DEFAULT 0,
    accepted_date DATETIME,
    attended BOOLEAN DEFAULT 0,
    attended_date DATETIME,
    invitation_code TEXT UNIQUE,
    creation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
    PRIMARY KEY(user_id, event_id)
  );
`);

// Seed initial admin if not exists
const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE type = ?').get('admin');
if (adminCount.count === 0) {
  const bcrypt = require('bcrypt');
  const hashedPassword = bcrypt.hashSync('admin', 10);
  let company = db.prepare('SELECT id FROM company LIMIT 1').get();
  if (!company) {
    const info = db.prepare("INSERT INTO company (name) VALUES ('Default Company')").run();
    company = { id: info.lastInsertRowid };
  }
  db.prepare('INSERT INTO users (name, surname, email, password, type, company_id) VALUES (?, ?, ?, ?, ?, ?)').run(
    'Admin', 'User', 'admin@example.com', hashedPassword, 'admin', company.id
  );
  console.log('Default admin created: admin@example.com / admin');
}

module.exports = db;
