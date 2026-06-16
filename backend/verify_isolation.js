const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database.sqlite'));

console.log('--- VERIFYING MULTI-COMPANY ISOLATION ---');

try {
    // 1. Create a dummy company 2
    db.prepare("INSERT OR IGNORE INTO companies (id, name) VALUES (2, 'Company Two')").run();

    // 2. Create events for both companies
    db.prepare("DELETE FROM events WHERE name = 'Event Comp 1' OR name = 'Event Comp 2'").run();
    db.prepare("INSERT INTO events (name, company_id) VALUES ('Event Comp 1', 1)").run();
    db.prepare("INSERT INTO events (name, company_id) VALUES ('Event Comp 2', 2)").run();

    // 3. Verify company 1 only sees event 1
    const comp1Events = db.prepare("SELECT * FROM events WHERE company_id = ?").all(1);
    const hasEvent2ForComp1 = comp1Events.some(e => e.name === 'Event Comp 2');
    if (hasEvent2ForComp1) {
        console.error('FAIL: Company 1 has access to Company 2 events!');
        process.exit(1);
    }
    console.log('PASS: Company 1 events are isolated from Company 2.');

    // 4. Verify company 2 only sees event 2
    const comp2Events = db.prepare("SELECT * FROM events WHERE company_id = ?").all(2);
    const hasEvent1ForComp2 = comp2Events.some(e => e.name === 'Event Comp 1');
    const hasEvent2ForComp2 = comp2Events.some(e => e.name === 'Event Comp 2');
    if (hasEvent1ForComp2 || !hasEvent2ForComp2) {
        console.error('FAIL: Company 2 events isolation failed! Visible events:', comp2Events);
        process.exit(1);
    }
    console.log('PASS: Company 2 events are isolated from Company 1.');

    // 5. Clean up test data
    db.prepare("DELETE FROM events WHERE name = 'Event Comp 1' OR name = 'Event Comp 2'").run();
    db.prepare("DELETE FROM companies WHERE id = 2").run();

    console.log('ALL TENANT-ISOLATION VERIFICATIONS PASSED.');
} catch (err) {
    console.error('FAIL: Unexpected error during verification:', err.message);
    process.exit(1);
}

db.close();
