const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database.sqlite'));

try {
    console.log('Beginning database rebuild with clean foreign keys and company_id...');
    
    // 1. Turn off foreign keys temporarily to allow re-creating tables
    db.pragma('foreign_keys = OFF');

    // 2. Safely backup events data if events_old doesn't already have it
    let hasEventsOld = false;
    try {
        db.prepare('SELECT 1 FROM events_old LIMIT 1').get();
        hasEventsOld = true;
    } catch (e) {
        // events_old doesn't exist yet
    }

    if (!hasEventsOld) {
        db.exec('ALTER TABLE events RENAME TO events_old');
    }

    // 3. Backup other tables if they exist
    db.exec('DROP TABLE IF EXISTS events_guests_old');
    db.exec('ALTER TABLE events_guests RENAME TO events_guests_old');

    db.exec('DROP TABLE IF EXISTS events_sponsors_old');
    db.exec('ALTER TABLE events_sponsors RENAME TO events_sponsors_old');

    db.exec('DROP TABLE IF EXISTS sponsors_old');
    db.exec('ALTER TABLE sponsors RENAME TO sponsors_old');

    // 4. Drop the failed/partial tables if they exist
    db.exec('DROP TABLE IF EXISTS events');
    db.exec('DROP TABLE IF EXISTS sponsors');

    // 5. Create new tables
    db.exec(`
      CREATE TABLE events (
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
        FOREIGN KEY(company_id) REFERENCES companies(id)
      )
    `);

    db.exec(`
      CREATE TABLE sponsors (
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
        FOREIGN KEY(company_id) REFERENCES companies(id)
      )
    `);

    db.exec(`
      CREATE TABLE events_guests (
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
      )
    `);

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

    // 6. Copy data from old tables
    db.exec(`
      INSERT INTO events (id, name, city, country, date, email_template, logo, status, creation_date, company_id)
      SELECT id, name, city, country, date, email_template, logo, status, creation_date, 1
      FROM events_old
    `);

    db.exec(`
      INSERT INTO sponsors (id, name, description, logo, url, contact, contact_email, contact_phone, country, company_id)
      SELECT id, name, description, logo, url, contact, contact_email, contact_phone, country, 1
      FROM sponsors_old
    `);

    db.exec(`
      INSERT INTO events_guests (user_id, event_id, invited, invited_date, accepted, accepted_date, attended, attended_date, invitation_code, creation_date)
      SELECT user_id, event_id, invited, invited_date, accepted, accepted_date, attended, attended_date, invitation_code, creation_date
      FROM events_guests_old
    `);

    db.exec(`
      INSERT INTO events_sponsors (event_id, sponsor_id, creation_date)
      SELECT event_id, sponsor_id, creation_date
      FROM events_sponsors_old
    `);

    // 7. Drop backup tables
    db.exec('DROP TABLE events_old');
    db.exec('DROP TABLE sponsors_old');
    db.exec('DROP TABLE events_guests_old');
    db.exec('DROP TABLE events_sponsors_old');

    // 8. Re-enable foreign keys
    db.pragma('foreign_keys = ON');

    console.log('Successfully completed database rebuild with clean foreign keys and company_id.');
} catch (err) {
    console.error('Error during database rebuild:', err.message);
}

db.close();
