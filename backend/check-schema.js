const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || 'database.sqlite';
const db = new Database(path.join(__dirname, dbPath));

console.log('\n📋 Database Schema Check:\n');

// Check fields table
try {
  const fieldsCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='fields'").get();
  console.log(fieldsCheck ? '✅ fields table exists' : '❌ fields table missing');
  
  if (fieldsCheck) {
    const fieldsSchema = db.prepare("PRAGMA table_info(fields)").all();
    console.log('   Columns:', fieldsSchema.map(c => c.name).join(', '));
  }
} catch (err) {
  console.log('❌ fields table error:', err.message);
}

// Check guestdata table
try {
  const guestdataCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='guestdata'").get();
  console.log(guestdataCheck ? '✅ guestdata table exists' : '❌ guestdata table missing');
  
  if (guestdataCheck) {
    const guestdataSchema = db.prepare("PRAGMA table_info(guestdata)").all();
    console.log('   Columns:', guestdataSchema.map(c => c.name).join(', '));
  }
} catch (err) {
  console.log('❌ guestdata table error:', err.message);
}

console.log('');
process.exit(0);
