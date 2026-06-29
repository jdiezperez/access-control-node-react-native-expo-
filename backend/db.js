const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const bcrypt = require('bcrypt');

const dialect = process.env.DB_DIALECT || 'sqlite';
let sequelize;

if (dialect === 'sqlite') {
  const dbPath = process.env.DB_PATH || 'database.sqlite';
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.isAbsolute(dbPath) ? dbPath : path.join(__dirname, dbPath),
    logging: false,
    define: {
      timestamps: false // matching original sqlite schema which had custom timestamps or none
    }
  });
} else {
  // PostgreSQL or other databases
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: dialect,
    logging: false,
    define: {
      timestamps: false
    }
  });
}

// ─── MODEL DEFINITIONS ───────────────────────────────────────────────────────

const Company = sequelize.define('Company', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  logo: DataTypes.STRING,
  address: DataTypes.STRING,
  email: DataTypes.STRING,
  phone: DataTypes.STRING,
  city: DataTypes.STRING,
  country: DataTypes.STRING
}, {
  tableName: 'companies'
});

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  company_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Company,
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  surname: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: DataTypes.STRING,
  role: DataTypes.STRING,
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['admin', 'manager', 'user', 'superadmin']]
    }
  },
  creation_date: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
}, {
  tableName: 'users',
  indexes: [
    {
      unique: true,
      fields: ['company_id'],
      where: {
        type: 'admin'
      },
      name: 'idx_one_admin_per_company'
    }
  ]
});

const Guest = sequelize.define('Guest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  creation_date: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
}, {
  tableName: 'guests'
});

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  city: DataTypes.STRING,
  country: DataTypes.STRING,
  date: DataTypes.DATE,
  email_template: DataTypes.TEXT,
  logo: DataTypes.STRING,
  status: {
    type: DataTypes.STRING,
    defaultValue: 'not active',
    validate: {
      isIn: [['not active', 'active', 'completed']]
    }
  },
  creation_date: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  },
  company_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Company,
      key: 'id'
    }
  }
}, {
  tableName: 'events'
});

const Sponsor = sequelize.define('Sponsor', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  logo: DataTypes.STRING,
  url: DataTypes.STRING,
  contact: DataTypes.STRING,
  contact_email: DataTypes.STRING,
  contact_phone: DataTypes.STRING,
  country: DataTypes.STRING,
  company_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Company,
      key: 'id'
    }
  }
}, {
  tableName: 'sponsors'
});

const EventSponsor = sequelize.define('EventSponsor', {
  event_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: Event,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  sponsor_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: Sponsor,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  creation_date: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
}, {
  tableName: 'events_sponsors'
});

const EventGuest = sequelize.define('EventGuest', {
  guest_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: Guest,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  event_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: Event,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  invited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  invited_date: DataTypes.DATE,
  accepted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  accepted_date: DataTypes.DATE,
  attended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  attended_date: DataTypes.DATE,
  invitation_code: {
    type: DataTypes.STRING,
    unique: true
  },
  creation_date: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
}, {
  tableName: 'events_guests'
});

const EventUser = sequelize.define('EventUser', {
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: User,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  event_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: Event,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  creation_date: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
}, {
  tableName: 'events_users'
});

const Field = sequelize.define('Field', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  event_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Event,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  field_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  field_type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['text', 'number', 'yes/no', 'options']]
    }
  },
  field_values: DataTypes.TEXT,
  field_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
}, {
  tableName: 'fields',
  indexes: [
    {
      unique: true,
      fields: ['event_id', 'field_name']
    }
  ]
});

const GuestData = sequelize.define('GuestData', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  guest_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Guest,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  field_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Field,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  field_value: DataTypes.TEXT,
  created_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
}, {
  tableName: 'guestdata',
  indexes: [
    {
      unique: true,
      fields: ['guest_id', 'field_id']
    }
  ]
});

// ─── ASSOCIATIONS ────────────────────────────────────────────────────────────

Company.hasMany(User, { foreignKey: 'company_id', as: 'users' });
User.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

Company.hasMany(Event, { foreignKey: 'company_id', as: 'events' });
Event.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

Company.hasMany(Sponsor, { foreignKey: 'company_id', as: 'sponsors' });
Sponsor.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// Many-to-Many: Events <-> Sponsors
Event.belongsToMany(Sponsor, { through: EventSponsor, foreignKey: 'event_id', otherKey: 'sponsor_id', as: 'sponsors' });
Sponsor.belongsToMany(Event, { through: EventSponsor, foreignKey: 'sponsor_id', otherKey: 'event_id', as: 'events' });

// Many-to-Many: Events <-> Guests
Event.belongsToMany(Guest, { through: EventGuest, foreignKey: 'event_id', otherKey: 'guest_id', as: 'guests' });
Guest.belongsToMany(Event, { through: EventGuest, foreignKey: 'guest_id', otherKey: 'event_id', as: 'events' });

// Many-to-Many: Events <-> Users
Event.belongsToMany(User, { through: EventUser, foreignKey: 'event_id', otherKey: 'user_id', as: 'assignedUsers' });
User.belongsToMany(Event, { Laundry: true, through: EventUser, foreignKey: 'user_id', otherKey: 'event_id', as: 'assignedEvents' });

// Event has many fields
Event.hasMany(Field, { foreignKey: 'event_id', as: 'fields', onDelete: 'CASCADE' });
Field.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });

// Guest has many guest data
Guest.hasMany(GuestData, { foreignKey: 'guest_id', as: 'data', onDelete: 'CASCADE' });
GuestData.belongsTo(Guest, { foreignKey: 'guest_id', as: 'guest' });

Field.hasMany(GuestData, { foreignKey: 'field_id', as: 'data', onDelete: 'CASCADE' });
GuestData.belongsTo(Field, { foreignKey: 'field_id', as: 'field' });

// ─── INITIALIZATION & SEEDING ───────────────────────────────────────────────

const initDb = async () => {
  // Sync the database schema (automatically creates tables if they do not exist)
  await sequelize.sync();

  // Seed default admin
  const adminCount = await User.count({ where: { type: 'admin' } });
  if (adminCount === 0) {
    const hashedPassword = bcrypt.hashSync('admin', 10);
    let company = await Company.findOne();
    if (!company) {
      company = await Company.create({ name: 'Default Company' });
    }
    await User.create({
      name: 'Admin',
      surname: 'User',
      email: 'admin@example.com',
      password: hashedPassword,
      type: 'admin',
      company_id: company.id
    });
    console.log('Default admin created: admin@example.com / admin');
  }

  // Seed default superadmin
  const superadminCount = await User.count({ where: { type: 'superadmin' } });
  if (superadminCount === 0) {
    const hashedPassword = bcrypt.hashSync('superadmin', 10);
    await User.create({
      name: 'Super',
      surname: 'Admin',
      email: 'superadmin@example.com',
      password: hashedPassword,
      type: 'superadmin',
      company_id: null
    });
    console.log('Default superadmin created: superadmin@example.com / superadmin');
  }
};

// Export the sequelize instance and all models
module.exports = {
  sequelize,
  Company,
  User,
  Guest,
  Event,
  Sponsor,
  EventSponsor,
  EventGuest,
  EventUser,
  Field,
  GuestData,
  initDb
};
