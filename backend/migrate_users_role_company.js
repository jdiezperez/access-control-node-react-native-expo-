const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const db = new Database(path.join(__dirname, 'database.sqlite'));

try {
    console.log('Migrating users table...');
    
    // 1. Rename existing users table
    db.exec('ALTER TABLE users RENAME TO users_old');
    
    // 2. Create new users table
    db.exec(`
      CREATE TABLE users (
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
      )
    `);
    
    // 3. Copy data and assign default company_id = 1
    db.exec(`
      INSERT INTO users (
        id, type, name, surname, role, organization, city, country, gender, image, email, password, creation_date, company_id
      )
      SELECT 
        id, type, name, surname, role, organization, city, country, gender, image, email, password, creation_date, 1
      FROM users_old
    `);
    
    // 4. Update password of admin@example.com to 'admin' and ensure other admins are converted to manager
    const newAdminPassword = bcrypt.hashSync('admin', 10);
    db.prepare('UPDATE users SET password = ? WHERE email = ?').run(newAdminPassword, 'admin@example.com');
    
    // Convert duplicate admin users (whose email is not 'admin@example.com') to 'manager'
    db.prepare("UPDATE users SET type = 'manager' WHERE type = 'admin' AND email != ?").run('admin@example.com');
    
    // 5. Create unique partial index to ensure only one admin per company
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_one_admin_per_company ON users (company_id) 
      WHERE type = 'admin'
    `);
    
    // 6. Drop old table
    db.exec('DROP TABLE users_old');
    
    console.log('Successfully migrated users table and updated admin@example.com password.');
} catch (err) {
    console.error('Error migrating users table:', err.message);
}

db.close();
