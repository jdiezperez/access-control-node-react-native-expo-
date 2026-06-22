const Database = require('better-sqlite3');
const path = require('path');
const dbPath = process.env.DB_PATH || 'database.sqlite';
const db = new Database(path.join(__dirname, dbPath));

db.pragma('foreign_keys = OFF'); // Turn off to allow renaming

const runMigration = db.transaction(() => {
    // 1. Rename users and events_guests
    db.prepare('ALTER TABLE users RENAME TO users_old').run();
    db.prepare('ALTER TABLE events_guests RENAME TO events_guests_old').run();

    // 2. Create new users table
    db.exec(`
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER,
            name TEXT NOT NULL,
            surname TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT,
            role TEXT,
            type TEXT NOT NULL CHECK(type IN ('admin', 'manager', 'user', 'superadmin')),
            creation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(company_id) REFERENCES companies(id)
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_one_admin_per_company ON users (company_id) WHERE type = 'admin';
    `);

    // 3. Insert non-guest users into new users table
    db.exec(`
        INSERT INTO users (id, company_id, name, surname, email, password, role, type, creation_date)
        SELECT id, company_id, name, surname, email, password, role, type, creation_date
        FROM users_old
        WHERE type != 'guest'
    `);

    // 4. Create guests table
    db.exec(`
        CREATE TABLE guests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            creation_date DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 5. Insert guests into guests table
    db.exec(`
        INSERT INTO guests (id, email, creation_date)
        SELECT id, email, creation_date
        FROM users_old
        WHERE type = 'guest'
    `);

    // 6. Create events_guests table
    db.exec(`
        CREATE TABLE events_guests (
            guest_id INTEGER,
            event_id INTEGER,
            invited BOOLEAN DEFAULT 0,
            invited_date DATETIME,
            accepted BOOLEAN DEFAULT 0,
            accepted_date DATETIME,
            attended BOOLEAN DEFAULT 0,
            attended_date DATETIME,
            invitation_code TEXT UNIQUE,
            creation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(guest_id) REFERENCES guests(id) ON DELETE CASCADE,
            FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
            PRIMARY KEY(guest_id, event_id)
        );
    `);

    // 7. Insert events_guests data
    db.exec(`
        INSERT INTO events_guests (guest_id, event_id, invited, invited_date, accepted, accepted_date, attended, attended_date, invitation_code, creation_date)
        SELECT user_id, event_id, invited, invited_date, accepted, accepted_date, attended, attended_date, invitation_code, creation_date
        FROM events_guests_old
    `);

    // 8. Update guestdata
    try {
        db.prepare('ALTER TABLE guestdata RENAME TO guestdata_old').run();
        db.exec(`
            CREATE TABLE guestdata (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guest_id INTEGER NOT NULL,
                field_id INTEGER NOT NULL,
                field_value TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(guest_id) REFERENCES guests(id) ON DELETE CASCADE,
                FOREIGN KEY(field_id) REFERENCES fields(id) ON DELETE CASCADE,
                UNIQUE(guest_id, field_id)
            );
        `);
        db.exec(`
            INSERT INTO guestdata (id, guest_id, field_id, field_value, created_at, updated_at)
            SELECT id, guest_id, field_id, field_value, created_at, updated_at
            FROM guestdata_old
        `);
        db.exec('DROP TABLE guestdata_old');
    } catch (e) {
        console.log("guestdata migration skipped: " + e.message);
    }

    // 9. Drop old tables
    db.exec('DROP TABLE users_old');
    db.exec('DROP TABLE events_guests_old');
});

try {
    runMigration();
    console.log("Migration successful");
} catch (e) {
    console.error("Migration failed:", e);
}

db.pragma('foreign_keys = ON');
