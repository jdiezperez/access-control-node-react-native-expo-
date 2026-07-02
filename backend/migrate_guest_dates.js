const { Sequelize } = require('sequelize');
const { sequelize } = require('./db');

const runMigration = async () => {
  const queryInterface = sequelize.getQueryInterface();

  const guestTableInfo = await queryInterface.describeTable('events_guests').catch(() => null);
  if (guestTableInfo) {
    const existingGuestColumns = new Set(Object.keys(guestTableInfo));
    const pendingDateColumns = ['invited_date', 'accepted_date', 'attended_date'].filter(name => !existingGuestColumns.has(name));
    const removableGuestColumns = ['invited', 'accepted', 'attended'].filter(name => existingGuestColumns.has(name));

    for (const column of pendingDateColumns) {
      await queryInterface.addColumn('events_guests', column, { type: Sequelize.DATE });
    }

    for (const column of removableGuestColumns) {
      await queryInterface.removeColumn('events_guests', column);
    }
  }

  const fieldTableInfo = await queryInterface.describeTable('fields').catch(() => null);
  if (fieldTableInfo) {
    const existingFieldColumns = new Set(Object.keys(fieldTableInfo));
    if (!existingFieldColumns.has('editable')) {
      await queryInterface.addColumn('fields', 'editable', { type: Sequelize.BOOLEAN, defaultValue: true });
    }
  }

  console.log('Guest status migration complete');
};

runMigration()
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  })
  .finally(() => {
    sequelize.close();
  });
