require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('./db');
const multer = require('multer');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const fs = require('fs');

// Multer Setup
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const folder = req.query.folder || 'general';
		const uploadPath = path.join(__dirname, 'uploads', folder);
		if (!fs.existsSync(uploadPath)) {
			fs.mkdirSync(uploadPath, { recursive: true });
		}
		cb(null, uploadPath);
	},
	filename: (req, file, cb) => {
		cb(null, Date.now() + '-' + file.originalname);
	},
});
const upload = multer({ storage });

// Middleware for Auth
const authenticateToken = (req, res, next) => {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];
	if (!token) return res.sendStatus(401);

	jwt.verify(token, JWT_SECRET, (err, user) => {
		if (err) return res.sendStatus(403);
		req.user = user;
		next();
	});
};

const isAdmin = (req, res, next) => {
	if (req.user.type !== 'admin' && req.user.type !== 'superadmin') return res.status(403).json({ message: 'Admin access required' });
	next();
};

const isManagerOrAdmin = (req, res, next) => {
	if (req.user.type !== 'admin' && req.user.type !== 'manager') {
		return res.status(403).json({ message: 'Access denied. Manager or Admin access required.' });
	}
	next();
};

const isStaff = (req, res, next) => {
	if (req.user.type !== 'admin' && req.user.type !== 'user' && req.user.type !== 'manager') {
		return res.status(403).json({ message: 'Access denied' });
	}
	next();
};

const isSuperAdmin = (req, res, next) => {
	if (req.user.type !== 'superadmin') {
		return res.status(403).json({ message: 'Superadmin access required' });
	}
	next();
};

// ─── Superadmin Routes ───────────────────────────────────────────────────────

// POST Superadmin upload route (for company logos)
app.post('/api/superadmin/upload', authenticateToken, isSuperAdmin, upload.single('image'), (req, res) => {
	if (!req.file) {
		return res.status(400).json({ message: 'No file uploaded' });
	}
	const folder = req.query.folder || 'company';
	const url = `/uploads/${folder}/${req.file.filename}`;
	res.json({ url });
});

// GET all companies (with stats)
/*
app.get('/api/superadmin/companies', authenticateToken, isSuperAdmin, (req, res) => {
	const companies = db.prepare(`
		SELECT 
			c.*,
			COUNT(DISTINCT CASE WHEN u.type != 'guest' THEN u.id END) as user_count,
			COUNT(DISTINCT e.id) as event_count
		FROM companies c
		LEFT JOIN users u ON u.company_id = c.id
		LEFT JOIN events e ON e.company_id = c.id
		GROUP BY c.id
		ORDER BY c.name ASC
	`).all();
	res.json(companies);
});
*/
app.get('/api/superadmin/companies', authenticateToken, isSuperAdmin, (req, res) => {
	const companies = db.prepare(`
		SELECT
			c.*,
			COUNT(DISTINCT CASE WHEN u.type != 'guest' THEN u.id END) AS user_count,
			COUNT(DISTINCT e.id) AS event_count
		FROM companies c
		LEFT JOIN users u ON u.company_id = c.id
		LEFT JOIN events e ON e.company_id = c.id
		GROUP BY c.id
		ORDER BY c.name ASC
	`).all();

	const admins = db.prepare(`
		SELECT
			id,
			company_id,
			name,
			surname,
			email
		FROM users
		WHERE type = 'admin'
	`).all();

	const companiesWithAdmin = companies.map(company => ({
		...company,
		admin: admins.find(admin => admin.company_id === company.id) || null,
	}));

	res.json(companiesWithAdmin);
});

// GET single company
app.get('/api/superadmin/companies/:id', authenticateToken, isSuperAdmin, (req, res) => {
	const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
	if (!company) return res.status(404).json({ message: 'Company not found' });
	res.json(company);
});

// POST create company + initial admin user
app.post('/api/superadmin/companies', authenticateToken, isSuperAdmin, (req, res) => {
	const { name, logo, address, email, phone, city, country, admin } = req.body;

	if (!name) return res.status(400).json({ message: 'Company name is required' });
	if (!admin || !admin.name || !admin.surname || !admin.email || !admin.password) {
		return res.status(400).json({ message: 'Admin user details (name, surname, email, password) are required' });
	}

	const createCompanyAndAdmin = db.transaction(() => {
		const companyInfo = db.prepare(
			'INSERT INTO companies (name, logo, address, email, phone, city, country) VALUES (?, ?, ?, ?, ?, ?, ?)'
		).run(name, logo || null, address || null, email || null, phone || null, city || null, country || null);

		const companyId = companyInfo.lastInsertRowid;
		const hashedPassword = bcrypt.hashSync(admin.password, 10);

		const userInfo = db.prepare(
			'INSERT INTO users (name, surname, email, password, type, company_id) VALUES (?, ?, ?, ?, ?, ?)'
		).run(admin.name, admin.surname, admin.email, hashedPassword, 'admin', companyId);

		return { companyId, adminId: userInfo.lastInsertRowid };
	});

	try {
		const result = createCompanyAndAdmin();
		res.json({ success: true, companyId: result.companyId, adminId: result.adminId });
	} catch (err) {
		console.error('Error creating company:', err);
		res.status(400).json({ message: err.message || 'Failed to create company' });
	}
});

// PUT update company info
app.put('/api/superadmin/companies/:id', authenticateToken, isSuperAdmin, (req, res) => {
	const { name, logo, address, email, phone, city, country, admin } = req.body;
	const company = db.prepare('SELECT id FROM companies WHERE id = ?').get(req.params.id);
	if (!company) return res.status(404).json({ message: 'Company not found' });
	const adminUser = db.prepare('SELECT id FROM users WHERE company_id = ? and type = ?').get([req.params.id, 'admin']);
	if (!adminUser) return res.status(404).json({ message: 'Admin user not found' });

    const updateCompanyAndAdmin = db.transaction(() => {
		db.prepare(
			'UPDATE companies SET name = ?, logo = ?, address = ?, email = ?, phone = ?, city = ?, country = ? WHERE id = ?'
		).run(name, logo || null, address || null, email || null, phone || null, city || null, country || null, req.params.id);

        if (admin.password && admin.password.length > 0) {
            const hashedPassword = bcrypt.hashSync(admin.password, 10);
	    	db.prepare(
		    	'UPDATE users SET name = ?, surname = ?, email = ?, password = ? WHERE id = ?'
		    ).run(admin.name, admin.surname, admin.email, hashedPassword, adminUser.id);
        } else {
            db.prepare(
		    	'UPDATE users SET name = ?, surname = ?, email = ? WHERE id = ?'
		    ).run(admin.name, admin.surname, admin.email, adminUser.id);
        }
        return { success: true };
    });

	try {
		const result = updateCompanyAndAdmin();
        res.json(result);
	} catch (err) {
		res.status(400).json({ message: 'Update failed: ' + err.message });
	}
});

// DELETE company + all associated data
app.delete('/api/superadmin/companies/:id', authenticateToken, isSuperAdmin, (req, res) => {
	const company = db.prepare('SELECT id FROM companies WHERE id = ?').get(req.params.id);
	if (!company) return res.status(404).json({ message: 'Company not found' });

	const deleteAll = db.transaction(() => {
		// events_guests and events_sponsors are cascade deleted via FK when events/users are deleted
		// But let's be explicit for safety
		const eventIds = db.prepare('SELECT id FROM events WHERE company_id = ?').all(req.params.id).map(e => e.id);
		if (eventIds.length > 0) {
			const placeholders = eventIds.map(() => '?').join(',');
			db.prepare(`DELETE FROM events_guests WHERE event_id IN (${placeholders})`).run(...eventIds);
			db.prepare(`DELETE FROM events_users WHERE event_id IN (${placeholders})`).run(...eventIds);
			db.prepare(`DELETE FROM events_sponsors WHERE event_id IN (${placeholders})`).run(...eventIds);
		}

		db.prepare('DELETE FROM events WHERE company_id = ?').run(req.params.id);
		db.prepare('DELETE FROM sponsors WHERE company_id = ?').run(req.params.id);
		db.prepare('DELETE FROM users WHERE company_id = ?').run(req.params.id);
		db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);
	});

	try {
		deleteAll();
		res.json({ success: true });
	} catch (err) {
		console.error('Error deleting company:', err);
		res.status(500).json({ message: 'Delete failed: ' + err.message });
	}
});

// GET users of a specific company (for superadmin view)
app.get('/api/superadmin/companies/:id/users', authenticateToken, isSuperAdmin, (req, res) => {
	const users = db.prepare(
		'SELECT id, name, surname, email, type, role, creation_date FROM users WHERE company_id = ? AND type != ? ORDER BY type ASC'
	).all(req.params.id, 'guest');
	res.json(users);
});

// ─── Auth Routes ───────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
	const { email, password } = req.body;
	const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

	if (!user || !bcrypt.compareSync(password, user.password)) {
		return res.status(401).json({ message: 'Invalid credentials' });
	}

	if (user.type !== 'admin' && user.type !== 'user' && user.type !== 'manager' && user.type !== 'superadmin') {
		return res.status(403).json({ message: 'Access denied. Unauthorized account type.' });
	}

	const token = jwt.sign({ id: user.id, email: user.email, type: user.type, company_id: user.company_id }, JWT_SECRET, { expiresIn: '24h' });
	res.json({ token, user: { id: user.id, name: user.name, surname: user.surname, email: user.email, role: user.role, gender: user.gender, type: user.type, company_id: user.company_id } });
});

// ─── Guests Routes ───────────────────────────────────────────────────────

// Upload Route
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
	if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
	const folder = req.query.folder || 'general';
	const url = `/uploads/${folder}/${req.file.filename}`;
	res.json({ url });
});

// ─── Admin Routes ───────────────────────────────────────────────────────

// Upload image
app.post('/api/admin/upload', authenticateToken, isManagerOrAdmin, upload.single('image'), (req, res) => {
	if (!req.file) {
		console.log('Upload failed: No file in request');
		return res.status(400).json({ message: 'No file uploaded' });
	}
	const folder = req.query.folder || 'general';
	const url = `/uploads/${folder}/${req.file.filename}`;
	console.log('File uploaded successfully:', url);
	res.json({ url });
});

// GET Company info for the logged-in user
app.get('/api/admin/companies', authenticateToken, isStaff, (req, res) => {
    console.log('Fetching company info for user:', req.user);
	const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.user.company_id);
	res.json(company || {});
});

// PUT update company info for the logged-in user
app.put('/api/admin/companies', authenticateToken, isStaff, (req, res) => {
	const { name, logo, address, email, phone, city, country } = req.body;
	const company = db.prepare('SELECT id FROM companies WHERE id = ?').get(req.user.company_id);
	if (!company) return res.status(404).json({ message: 'Company not found' });

	try {
		db.prepare(
			'UPDATE companies SET name = ?, logo = ?, address = ?, email = ?, phone = ?, city = ?, country = ? WHERE id = ?'
		).run(name, logo || null, address || null, email || null, phone || null, city || null, country || null, req.user.company_id);
		res.json({ success: true });
	} catch (err) {
		res.status(400).json({ message: 'Update failed: ' + err.message });
	}
});

// GET Users (Admins & Guests)
app.get('/api/admin/users', authenticateToken, isManagerOrAdmin, (req, res) => {
	const type = req.query.type;
	let users;
	if (type) {
		users = db.prepare('SELECT * FROM users WHERE type = ? AND company_id = ?').all(type, req.user.company_id);
	} else {
		users = db.prepare("SELECT * FROM users WHERE company_id = ? AND type != 'admin'").all(req.user.company_id);
	}
	res.json(users);
});

// POST Create User (Managers & Guests)
app.post('/api/admin/users', authenticateToken, isManagerOrAdmin, (req, res) => {
	const { name, surname, email, type, password, city, country, organization, role, gender } = req.body;

	// Validation: manager cannot create/promote admin or superadmin
	if (type === 'superadmin') {
		return res.status(403).json({ message: 'SuperAdmin users cannot be created' });
	}

	if (type === 'admin') {
		return res.status(403).json({ message: 'Admin users cannot be created by Managers or Admins' });
	}

    if (req.user.type === 'manager' && type === 'manager') {
        return res.status(403).json({ message: 'Managers cannot create other managers' });
    }

	const hashedPassword = password ? bcrypt.hashSync(password, 10) : null;
	try {
		const info = db.prepare(`
			INSERT INTO users (name, surname, email, type, password, city, country, organization, role, gender, company_id)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).run(
			name, surname, email, type || 'guest', hashedPassword,
			city || null, country || null, organization || null, role || null, gender || null,
			req.user.company_id
		);
		res.json({ id: info.lastInsertRowid });
	} catch (err) {
		console.error('Error creating user:', err);
		res.status(400).json({ message: 'User already exists or invalid data' });
	}
});

// PUT Update User (Managers & Guests)
app.put('/api/admin/users/:id', authenticateToken, isManagerOrAdmin, (req, res) => {
	const { name, surname, email, type, city, country, organization, role, gender, image } = req.body;

	// Validation: manager cannot promote/demote admin & user must be in same company
	const userToEdit = db.prepare('SELECT type, company_id FROM users WHERE id = ?').get(req.params.id);
	if (!userToEdit || userToEdit.company_id !== req.user.company_id) {
		return res.status(404).json({ message: 'User not found' });
	}

    if (req.user.type === 'manager') {
        if (parseInt(req.params.id) !== req.user.id && userToEdit.type !== 'user') {
            return res.status(403).json({ message: 'Managers can only edit users of type "user"' });
        }
        if (type && type !== userToEdit.type) {
            return res.status(403).json({ message: 'Managers cannot change user roles' });
        }
    }

	if (req.user.type === 'admin' && (type === 'superadmin' || userToEdit.type === 'superadmin')) {
		return res.status(403).json({ message: 'Admins cannot modify or assign superadmin privileges' });
	}

	// Validation: one admin per company
	if (type === 'admin') {
		const existingAdmin = db.prepare('SELECT id FROM users WHERE type = ? AND company_id = ? AND id != ?').get('admin', req.user.company_id, req.params.id);
		if (existingAdmin) {
			return res.status(400).json({ message: 'There can only be one admin user per company.' });
		}
	}

	try {
		db.prepare(`
			UPDATE users SET name = ?, surname = ?, email = ?, type = ?, city = ?, country = ?, organization = ?, role = ?, gender = ?, image = ?
			WHERE id = ? AND company_id = ?
		`).run(name, surname, email, type, city, country, organization, role, gender, image, req.params.id, req.user.company_id);
		res.json({ success: true });
	} catch (err) {
		res.status(400).json({ message: 'Update failed: ' + err.message });
	}
});

app.delete('/api/admin/users/:id', authenticateToken, isManagerOrAdmin, (req, res) => {
	const userToDelete = db.prepare('SELECT type, company_id FROM users WHERE id = ?').get(req.params.id);
	if (!userToDelete || userToDelete.company_id !== req.user.company_id) return res.status(404).json({ message: 'User not found' });

    if (req.user.type === 'manager' && userToDelete.type !== 'user') {
        return res.status(403).json({ message: 'Managers can only delete users of type "user"' });
    }

	if (userToDelete.type === 'superadmin') {
		return res.status(403).json({ message: 'Superadmin cannot be deleted' });
	}

	try {
		db.prepare('DELETE FROM users WHERE id = ? AND company_id = ?').run(req.params.id, req.user.company_id);
		res.json({ success: true });
	} catch (err) {
		res.status(400).json({ message: 'Delete failed' });
	}
});

// User-Event Assignment Routes (staff: managers & users)
app.get('/api/admin/users/:id/events', authenticateToken, isManagerOrAdmin, (req, res) => {
	const targetUser = db.prepare('SELECT company_id, type FROM users WHERE id = ?').get(req.params.id);
	if (!targetUser || targetUser.company_id !== req.user.company_id) {
		return res.status(404).json({ message: 'User not found' });
	}
	if (req.user.type === 'manager' && targetUser.type !== 'user' && parseInt(req.params.id) !== req.user.id) {
		return res.status(403).json({ message: 'Managers can only view events for themselves or "user" type accounts' });
	}
	let events;
	if (req.user.type === 'manager' && parseInt(req.params.id) !== req.user.id) {
		// Manager viewing another user's events: only show events the manager is also assigned to
		events = db.prepare(`
			SELECT e.*,
				CASE WHEN eu_target.user_id IS NOT NULL THEN 1 ELSE 0 END as assigned
			FROM events e
			JOIN events_users eu_manager ON e.id = eu_manager.event_id AND eu_manager.user_id = ?
			LEFT JOIN events_users eu_target ON e.id = eu_target.event_id AND eu_target.user_id = ?
			WHERE e.status IN ('not active', 'active') AND e.company_id = ?
			ORDER BY e.date DESC
		`).all(req.user.id, parseInt(req.params.id), req.user.company_id);
	} else {
		// Admin or manager viewing their own events: show all company events
		events = db.prepare(`
			SELECT e.*,
				CASE WHEN eu.user_id IS NOT NULL THEN 1 ELSE 0 END as assigned
			FROM events e
			LEFT JOIN events_users eu ON e.id = eu.event_id AND eu.user_id = ?
			WHERE e.status IN ('not active', 'active') AND e.company_id = ?
			ORDER BY e.date DESC
		`).all(parseInt(req.params.id), req.user.company_id);
	}
	res.json(events);
});

app.post('/api/admin/users/:id/events/:eventId', authenticateToken, isManagerOrAdmin, (req, res) => {
	const { id, eventId } = req.params;
	const targetUser = db.prepare('SELECT company_id, type FROM users WHERE id = ?').get(id);
	const targetEvent = db.prepare('SELECT company_id FROM events WHERE id = ?').get(eventId);
	if (!targetUser || targetUser.company_id !== req.user.company_id || !targetEvent || targetEvent.company_id !== req.user.company_id) {
		return res.status(403).json({ message: 'Unauthorized access' });
	}
	if (req.user.type === 'manager') {
		if (targetUser.type !== 'user') {
			return res.status(403).json({ message: 'Managers can only manage event assignments for "user" type accounts' });
		}
		const managerAssigned = db.prepare('SELECT 1 FROM events_users WHERE user_id = ? AND event_id = ?').get(req.user.id, eventId);
		if (!managerAssigned) {
			return res.status(403).json({ message: 'Managers can only assign users to events they themselves belong to' });
		}
	}
	try {
		db.prepare('INSERT OR IGNORE INTO events_users (user_id, event_id) VALUES (?, ?)').run(id, eventId);
		res.json({ success: true });
	} catch (err) {
		res.status(400).json({ message: 'Error assigning event: ' + err.message });
	}
});

app.delete('/api/admin/users/:id/events/:eventId', authenticateToken, isManagerOrAdmin, (req, res) => {
	const { id, eventId } = req.params;
	const targetUser = db.prepare('SELECT company_id, type FROM users WHERE id = ?').get(id);
	const targetEvent = db.prepare('SELECT company_id FROM events WHERE id = ?').get(eventId);
	if (!targetUser || targetUser.company_id !== req.user.company_id || !targetEvent || targetEvent.company_id !== req.user.company_id) {
		return res.status(403).json({ message: 'Unauthorized access' });
	}
	if (req.user.type === 'manager') {
		if (targetUser.type !== 'user') {
			return res.status(403).json({ message: 'Managers can only manage event assignments for "user" type accounts' });
		}
		const managerAssigned = db.prepare('SELECT 1 FROM events_users WHERE user_id = ? AND event_id = ?').get(req.user.id, eventId);
		if (!managerAssigned) {
			return res.status(403).json({ message: 'Managers can only unassign users from events they themselves belong to' });
		}
	}
	try {
		db.prepare('DELETE FROM events_users WHERE user_id = ? AND event_id = ?').run(id, eventId);
		res.json({ success: true });
	} catch (err) {
		res.status(400).json({ message: 'Error unassigning event: ' + err.message });
	}
});

app.post('/api/admin/guests/:id/send', authenticateToken, isManagerOrAdmin, (req, res) => {
	const guest = db.prepare('SELECT g.id FROM guests g JOIN events_guests eg ON g.id = eg.guest_id JOIN events e ON eg.event_id = e.id WHERE g.id = ? AND e.company_id = ?').get(req.params.id, req.user.company_id);
	if (!guest) return res.status(404).json({ message: 'Guest not found' });
	res.json({ success: true, message: 'Invitation email sent' });
});

app.get('/api/admin/guests', authenticateToken, isManagerOrAdmin, (req, res) => {
	const guests = db.prepare(`
		SELECT g.id, g.email, g.creation_date, COUNT(eg.event_id) as event_count
		FROM guests g
		JOIN events_guests eg ON g.id = eg.guest_id
		JOIN events e ON eg.event_id = e.id
		WHERE e.company_id = ?
		GROUP BY g.id
	`).all(req.user.company_id);
    
    const enrichedGuests = guests.map(g => {
        const guestDataRows = db.prepare(`
            SELECT f.field_name, gd.field_value 
            FROM guestdata gd 
            JOIN fields f ON gd.field_id = f.id 
            WHERE gd.guest_id = ?
        `).all(g.id);
        let guestObj = { ...g, name: '', surname: '', organization: '', role: '', city: '', country: '', gender: '' };
        guestDataRows.forEach(row => {
            guestObj[row.field_name] = row.field_value;
        });
        return guestObj;
    });

	res.json(enrichedGuests);
});

app.get('/api/admin/guests/:id/events', authenticateToken, isManagerOrAdmin, (req, res) => {
	const events = db.prepare(`
		SELECT e.name, e.date, eg.invited, eg.accepted, eg.attended
		FROM events e
		JOIN events_guests eg ON e.id = eg.event_id
		WHERE eg.guest_id = ? AND e.company_id = ?
	`).all(req.params.id, req.user.company_id);
	res.json(events);
});

app.post('/api/admin/events/:eventId/guests/create', authenticateToken, isManagerOrAdmin, (req, res) => {
    const { eventId } = req.params;
    const { guestData } = req.body; 
    
    const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(eventId);
    if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });

    try {
        db.transaction(() => {
            let guestInfo = db.prepare('SELECT id FROM guests WHERE email = ?').get(guestData.email);
            let guestId;
            if (guestInfo) {
                guestId = guestInfo.id;
            } else {
                const insertGuest = db.prepare('INSERT INTO guests (email) VALUES (?)').run(guestData.email);
                guestId = insertGuest.lastInsertRowid;
            }

            const invitationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            db.prepare(`
                INSERT OR IGNORE INTO events_guests (guest_id, event_id, invitation_code)
                VALUES (?, ?, ?)
            `).run(guestId, eventId, invitationCode);

            const fields = db.prepare('SELECT id, field_name FROM fields WHERE event_id = ?').all(eventId);
            const insertData = db.prepare(`
                INSERT OR REPLACE INTO guestdata (guest_id, field_id, field_value)
                VALUES (?, ?, ?)
            `);

            fields.forEach(field => {
                if (guestData[field.field_name] !== undefined) {
                    insertData.run(guestId, field.id, guestData[field.field_name]);
                }
            });
        })();
        res.json({ success: true });
    } catch (err) {
        console.error('Error creating guest:', err);
        res.status(400).json({ message: 'Error creating guest: ' + err.message });
    }
});

app.post('/api/admin/events/:eventId/guests', authenticateToken, isManagerOrAdmin, (req, res) => {
    const { eventId } = req.params;
    const { guestIds } = req.body;
    
    const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(eventId);
    if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });

    try {
        db.transaction(() => {
            const stmt = db.prepare(`
                INSERT OR IGNORE INTO events_guests (guest_id, event_id, invitation_code)
                VALUES (?, ?, ?)
            `);
            guestIds.forEach(guestId => {
                const invitationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                stmt.run(guestId, eventId, invitationCode);
            });
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ message: 'Error assigning guests: ' + err.message });
    }
});

// Admin Routes - Events
app.get('/api/admin/events', authenticateToken, isManagerOrAdmin, (req, res) => {
	const events = db.prepare('SELECT * FROM events WHERE company_id = ?').all(req.user.company_id);
	res.json(events);
});

app.get('/api/admin/events/:id', authenticateToken, isManagerOrAdmin, (req, res) => {
	const event = db.prepare('SELECT * FROM events WHERE id = ? AND company_id = ?').get(req.params.id, req.user.company_id);
	if (!event) return res.status(404).json({ message: 'Event not found' });
	res.json(event);
});

// Invite helpers
const SENDPIGEON_API = 'https://api.sendpigeon.dev/v1/emails';
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@sendpigeon-sandbox.dev';

const sendpigeonHeaders = () => ({
	Authorization: `Bearer ${process.env.SENDPIGEON_API_KEY}`,
	'Content-Type': 'application/json',
});

const FRONTEND_BASE = process.env.FRONTEND_BASE || 'http://localhost';
const FRONTEND_PORT = process.env.FRONTEND_PORT || '5173';
const FRONTEND_URL = `${FRONTEND_BASE}:${FRONTEND_PORT}`;

const buildEmailHtml = (template, guest, event, invitationCode) => {
	const date = event.date ? new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
	const confirmationLink = `${FRONTEND_URL}/confirm/${invitationCode}`;

	let html = template
		.replace(/{{guest_name}}/g, `${guest.name} ${guest.surname}`)
		.replace(/{{event_name}}/g, event.name || '')
		.replace(/{{event_city}}/g, guest.city || '')
		.replace(/{{event_country}}/g, guest.country || '')
		.replace(/{{guest_city}}/g, guest.city || '')
		.replace(/{{guest_country}}/g, guest.country || '')
		.replace(/{{event_date}}/g, date);

	// Append confirmation link if it's an invitation email
	if (invitationCode) {
		html += `
			<br><br>
			<div style="text-align: center; margin-top: 30px;">
				<a href="${confirmationLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
					Confirm Attendance & Complete Profile
				</a>
				<p style="color: #6B7280; font-size: 12px; margin-top: 10px;">
					Or copy this link: ${confirmationLink}
				</p>
			</div>
		`;
	}
	return html;
};

const buildBadgeEmailHtml = (guest, event) => {
	const date = event.date ? new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
	const qrValue = guest.invitation_code || guest.email;
	const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrValue)}`;

	return `
		<div style="font-family: sans-serif; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; color: #1e293b;">
			<div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 24px; color: white;">
				<p style="margin: 0; font-size: 10px; font-weight: bold; text-transform: uppercase; opacity: 0.6;">Your Official Badge</p>
				<h2 style="margin: 4px 0 0 0; font-size: 20px;">${event.name}</h2>
				<p style="margin: 8px 0 0 0; font-size: 12px; opacity: 0.8;">${date} • ${event.city}, ${event.country}</p>
			</div>
			<div style="padding: 24px; display: flex; align-items: center; gap: 20px;">
				<div>
					<p style="margin: 0; font-size: 10px; font-weight: bold; text-transform: uppercase; color: #94a3b8;">Guest</p>
					<p style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold;">${guest.name} ${guest.surname}</p>
					<p style="margin: 4px 0 0 0; font-size: 14px; color: #4f46e5; font-weight: 600;">${guest.role || ''}</p>
					<p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">${guest.organization || ''}</p>
				</div>
			</div>
			<div style="padding: 0 24px 24px 24px; text-align: center; background-color: #f8fafc;">
				<p style="margin-bottom: 12px; font-size: 12px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Scan at Entry</p>
				<img src="${qrUrl}" alt="Badge QR Code" style="background: white; padding: 10px; border-radius: 12px; border: 1px solid #e2e8f0;" />
				<p style="margin-top: 8px; font-size: 10px; font-family: monospace; color: #94a3b8;">${qrValue}</p>
			</div>
		</div>
		<p style="text-align: center; font-size: 14px; color: #64748b; margin-top: 20px;">
			Please have this QR code ready on your mobile device or printed for entry.
		</p>
	`;
};

app.post('/api/admin/events/:id/guests/:guestId/invite', authenticateToken, isManagerOrAdmin, async (req, res) => {
	const event = db.prepare('SELECT * FROM events WHERE id = ? AND company_id = ?').get(req.params.id, req.user.company_id);
	if (!event) return res.status(404).json({ message: 'Event not found' });
	if (!event.email_template) return res.status(400).json({ message: 'No email template set for this event' });

	const guestInfo = db.prepare(`
		SELECT g.id, g.email, eg.invitation_code 
		FROM guests g 
		JOIN events_guests eg ON g.id = eg.guest_id 
		WHERE g.id = ? AND eg.event_id = ?
	`).get(req.params.guestId, req.params.id);
	
	if (!guestInfo) return res.status(404).json({ message: 'Guest not found' });

    const guestDataRows = db.prepare(`
        SELECT f.field_name, gd.field_value 
        FROM guestdata gd JOIN fields f ON gd.field_id = f.id 
        WHERE gd.guest_id = ? AND f.event_id = ?
    `).all(req.params.guestId, req.params.id);
    
    let guest = { id: guestInfo.id, email: guestInfo.email, invitation_code: guestInfo.invitation_code, name: '', surname: '', city: '', country: '', role: '', organization: '' };
    guestDataRows.forEach(row => guest[row.field_name] = row.field_value);

	try {
		const html = buildEmailHtml(event.email_template, guest, event, guest.invitation_code);
		const response = await axios.post(SENDPIGEON_API, {
			from: EMAIL_FROM,
			to: guest.email,
			subject: `You are invited to ${event.name}`,
			html,
		}, { headers: sendpigeonHeaders() });

		if (response.data?.status === 'failed') {
			return res.status(500).json({ message: 'Email delivery failed' });
		}

		db.prepare('UPDATE events_guests SET invited = 1, invited_date = CURRENT_TIMESTAMP WHERE event_id = ? AND guest_id = ?')
			.run(req.params.id, req.params.guestId);
		res.json({ success: true });
	} catch (err) {
		const msg = err.response?.data?.message || err.message;
		res.status(500).json({ message: 'Failed to send invitation: ' + msg });
	}
});

// Invite all guests in an event (uses batch API — up to 100 per call)
app.post('/api/admin/events/:id/invite-all', authenticateToken, isManagerOrAdmin, async (req, res) => {
	const event = db.prepare('SELECT * FROM events WHERE id = ? AND company_id = ?').get(req.params.id, req.user.company_id);
	if (!event) return res.status(404).json({ message: 'Event not found' });
	if (!event.email_template) return res.status(400).json({ message: 'No email template set for this event' });

	const baseGuests = db.prepare(`
		SELECT g.id, g.email, eg.invitation_code 
		FROM guests g
		JOIN events_guests eg ON g.id = eg.guest_id
		WHERE eg.event_id = ?
	`).all(req.params.id);

	if (baseGuests.length === 0) return res.json({ success: true, sent: 0, errors: [] });

    const guests = baseGuests.map(g => {
        const guestDataRows = db.prepare(`
            SELECT f.field_name, gd.field_value 
            FROM guestdata gd JOIN fields f ON gd.field_id = f.id 
            WHERE gd.guest_id = ? AND f.event_id = ?
        `).all(g.id, req.params.id);
        
        let guestObj = { ...g, name: '', surname: '', city: '', country: '', role: '', organization: '' };
        guestDataRows.forEach(row => guestObj[row.field_name] = row.field_value);
        return guestObj;
    });

	// Build batch payload (chunks of 100)
	const emails = guests.map(guest => ({
		from: EMAIL_FROM,
		to: guest.email,
		subject: `You are invited to ${event.name}`,
		html: buildEmailHtml(event.email_template, guest, event, guest.invitation_code),
	}));

	try {
		const response = await axios.post(`${SENDPIGEON_API}/batch`, { emails }, { headers: sendpigeonHeaders() });
		const results = response.data?.data || [];
		const errors = results
			.filter(r => r.status === 'failed')
			.map(r => ({ guest: guests[r.index]?.email, error: 'Delivery failed' }));

		// Mark successfully sent guests as invited
		const updateStmt = db.prepare('UPDATE events_guests SET invited = 1, invited_date = CURRENT_TIMESTAMP WHERE event_id = ? AND guest_id = ?');
		results
			.filter(r => r.status !== 'failed')
			.forEach(r => { if (guests[r.index]) updateStmt.run(req.params.id, guests[r.index].id); });

		res.json({ success: true, sent: results.length - errors.length, errors });
	} catch (err) {
		const msg = err.response?.data?.message || err.message;
		res.status(500).json({ message: 'Failed to send invitations: ' + msg });
	}
});

app.post('/api/admin/events', authenticateToken, isManagerOrAdmin, (req, res) => {
	const { name, city, country, date, email_template, status, logo } = req.body;
	try {
		const info = db.transaction(() => {
			const result = db.prepare(`
				INSERT INTO events (name, city, country, date, email_template, status, logo, company_id)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			`).run(name, city, country, date, email_template, status || 'not active', logo, req.user.company_id);
			
			const eventId = result.lastInsertRowid;
			
			const insertField = db.prepare(`
				INSERT INTO fields (event_id, field_name, field_type, field_order, required)
				VALUES (?, ?, ?, ?, ?)
			`);
			insertField.run(eventId, 'name', 'text', 0, 1);
			insertField.run(eventId, 'surname', 'text', 1, 1);
			insertField.run(eventId, 'email', 'text', 2, 1);
			
			return eventId;
		})();
		res.json({ id: info });
	} catch (err) {
		console.error("Error creating event:", err);
		res.status(500).json({ message: 'Error creating event' });
	}
});

app.put('/api/admin/events/:id', authenticateToken, isManagerOrAdmin, (req, res) => {
	const { name, city, country, date, email_template, status, logo } = req.body;
	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(req.params.id);
	if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });
	db.prepare(`
		UPDATE events SET name = ?, city = ?, country = ?, date = ?, email_template = ?, status = ?, logo = ?
		WHERE id = ? AND company_id = ?
	`).run(name, city, country, date, email_template, status || 'not active', logo, req.params.id, req.user.company_id);
	res.json({ success: true });
});

// Admin Routes - Custom Event Fields
app.get('/api/admin/events/:eventId/fields', authenticateToken, isManagerOrAdmin, (req, res) => {
	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(req.params.eventId);
	if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });
	
	const fields = db.prepare(`
		SELECT id, event_id, field_name, field_type, field_values, field_order, required
		FROM fields
		WHERE event_id = ?
		ORDER BY field_order ASC
	`).all(req.params.eventId);
	
	res.json(fields);
});

app.post('/api/admin/events/:eventId/fields', authenticateToken, isManagerOrAdmin, (req, res) => {
	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(req.params.eventId);
	if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });
	
	const { field_name, field_type, field_values, required } = req.body;
	if (!field_name || !field_type) return res.status(400).json({ message: 'field_name and field_type required' });
	
	try {
		const maxOrder = db.prepare('SELECT COALESCE(MAX(field_order), -1) as max_order FROM fields WHERE event_id = ?').get(req.params.eventId);
		const info = db.prepare(`
			INSERT INTO fields (event_id, field_name, field_type, field_values, field_order, required)
			VALUES (?, ?, ?, ?, ?, ?)
		`).run(req.params.eventId, field_name, field_type, field_values || null, maxOrder.max_order + 1, required ? 1 : 0);
		
		res.json({ id: info.lastInsertRowid });
	} catch (err) {
		if (err.message.includes('UNIQUE constraint failed')) {
			return res.status(400).json({ message: 'Field name already exists for this event' });
		}
		res.status(500).json({ message: 'Database error' });
	}
});

app.put('/api/admin/events/:eventId/fields/:fieldId', authenticateToken, isManagerOrAdmin, (req, res) => {
	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(req.params.eventId);
	if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });
	
	const field = db.prepare('SELECT event_id FROM fields WHERE id = ?').get(req.params.fieldId);
	if (!field || field.event_id !== parseInt(req.params.eventId)) return res.status(404).json({ message: 'Field not found' });
	
	const { field_name, field_type, field_values, required } = req.body;
	
	try {
		db.prepare(`
			UPDATE fields
			SET field_name = COALESCE(?, field_name),
				field_type = COALESCE(?, field_type),
				field_values = ?,
				required = COALESCE(?, required),
				updated_at = CURRENT_TIMESTAMP
			WHERE id = ?
		`).run(field_name || null, field_type || null, field_values !== undefined ? field_values : null, required !== undefined ? (required ? 1 : 0) : null, req.params.fieldId);
		
		res.json({ success: true });
	} catch (err) {
		if (err.message.includes('UNIQUE constraint failed')) {
			return res.status(400).json({ message: 'Field name already exists for this event' });
		}
		res.status(500).json({ message: 'Database error' });
	}
});

app.delete('/api/admin/events/:eventId/fields/:fieldId', authenticateToken, isManagerOrAdmin, (req, res) => {
	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(req.params.eventId);
	if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });
	
	const field = db.prepare('SELECT event_id FROM fields WHERE id = ?').get(req.params.fieldId);
	if (!field || field.event_id !== parseInt(req.params.eventId)) return res.status(404).json({ message: 'Field not found' });
	
	db.prepare('DELETE FROM fields WHERE id = ?').run(req.params.fieldId);
	res.json({ success: true });
});

app.post('/api/admin/events/:eventId/fields/reorder', authenticateToken, isManagerOrAdmin, (req, res) => {
	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(req.params.eventId);
	if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });
	
	const { fieldOrder } = req.body; // Array of field IDs in desired order
	if (!Array.isArray(fieldOrder)) return res.status(400).json({ message: 'fieldOrder must be an array' });
	
	try {
		const stmt = db.prepare('UPDATE fields SET field_order = ? WHERE id = ? AND event_id = ?');
		fieldOrder.forEach((fieldId, index) => {
			stmt.run(index, fieldId, req.params.eventId);
		});
		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ message: 'Database error' });
	}
});

app.get('/api/admin/events/:eventId/field-templates', authenticateToken, isManagerOrAdmin, (req, res) => {
	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(req.params.eventId);
	if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });
	
	const templates = db.prepare(`
		SELECT DISTINCT e.id, e.name
		FROM events e
		LEFT JOIN fields f ON e.id = f.event_id
		WHERE e.company_id = ? AND e.id != ? AND f.id IS NOT NULL
		ORDER BY e.name ASC
	`).all(req.user.company_id, req.params.eventId);
	
	res.json(templates);
});

app.post('/api/admin/events/:eventId/copy-fields', authenticateToken, isManagerOrAdmin, (req, res) => {
	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(req.params.eventId);
	if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });
	
	const { sourceEventId } = req.body;
	if (!sourceEventId) return res.status(400).json({ message: 'sourceEventId required' });
	
	const sourceEvent = db.prepare('SELECT company_id FROM events WHERE id = ?').get(sourceEventId);
	if (!sourceEvent || sourceEvent.company_id !== req.user.company_id) return res.status(404).json({ message: 'Source event not found' });
	
	try {
		// Delete existing fields in target event
		db.prepare('DELETE FROM fields WHERE event_id = ?').run(req.params.eventId);
		
		// Copy fields from source event
		const sourceFields = db.prepare(`
			SELECT field_name, field_type, field_values, required
			FROM fields
			WHERE event_id = ?
			ORDER BY field_order ASC
		`).all(sourceEventId);
		
		const stmt = db.prepare(`
			INSERT INTO fields (event_id, field_name, field_type, field_values, field_order, required)
			VALUES (?, ?, ?, ?, ?, ?)
		`);
		
		sourceFields.forEach((field, index) => {
			stmt.run(req.params.eventId, field.field_name, field.field_type, field.field_values, index, field.required);
		});
		
		res.json({ success: true, copiedCount: sourceFields.length });
	} catch (err) {
		res.status(500).json({ message: 'Database error' });
	}
});

// Admin Routes - Guest Custom Data
app.get('/api/admin/events/:eventId/guests/:guestId/customdata', authenticateToken, isManagerOrAdmin, (req, res) => {
	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(req.params.eventId);
	if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });
	
	const customData = db.prepare(`
		SELECT g.id as custom_data_id, g.field_id, f.field_name, f.field_type, g.field_value
		FROM guestdata g
		JOIN fields f ON g.field_id = f.id
		WHERE g.guest_id = ? AND f.event_id = ?
		ORDER BY f.field_order ASC
	`).all(req.params.guestId, req.params.eventId);
	
	res.json(customData);
});

app.post('/api/admin/events/:eventId/guests/:guestId/customdata', authenticateToken, isManagerOrAdmin, (req, res) => {
	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(req.params.eventId);
	if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });
	
	const { customData } = req.body; // Array of { field_id, field_value }
	if (!Array.isArray(customData)) return res.status(400).json({ message: 'customData must be an array' });
	
	try {
		const stmt = db.prepare(`
			INSERT INTO guestdata (guest_id, field_id, field_value)
			VALUES (?, ?, ?)
			ON CONFLICT(guest_id, field_id) DO UPDATE SET field_value = excluded.field_value, updated_at = CURRENT_TIMESTAMP
		`);
		
		customData.forEach(({ field_id, field_value }) => {
			stmt.run(req.params.guestId, field_id, field_value || null);
		});
		
		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ message: 'Database error' });
	}
});

app.put('/api/admin/events/:eventId/guests/:guestId/customdata/:fieldId', authenticateToken, isManagerOrAdmin, (req, res) => {
	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(req.params.eventId);
	if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });
	
	const { field_value } = req.body;
	
	try {
		db.prepare(`
			UPDATE guestdata
			SET field_value = ?, updated_at = CURRENT_TIMESTAMP
			WHERE guest_id = ? AND field_id = ?
		`).run(field_value || null, req.params.guestId, req.params.fieldId);
		
		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ message: 'Database error' });
	}
});

// Admin Routes - Sponsors
app.get('/api/admin/sponsors', authenticateToken, isManagerOrAdmin, (req, res) => {
	const sponsors = db.prepare(`
		SELECT s.*, COUNT(es.event_id) as event_count
		FROM sponsors s
		LEFT JOIN events_sponsors es ON s.id = es.sponsor_id
		WHERE s.company_id = ?
		GROUP BY s.id
	`).all(req.user.company_id);
	res.json(sponsors);
});

app.get('/api/admin/sponsors/:id/events', authenticateToken, isManagerOrAdmin, (req, res) => {
	const sponsor = db.prepare('SELECT company_id FROM sponsors WHERE id = ?').get(req.params.id);
	if (!sponsor || sponsor.company_id !== req.user.company_id) return res.status(404).json({ message: 'Sponsor not found' });

	const events = db.prepare(`
		SELECT e.name, e.date
		FROM events e
		JOIN events_sponsors es ON e.id = es.event_id
		WHERE es.sponsor_id = ? AND e.company_id = ?
	`).all(req.params.id, req.user.company_id);
	res.json(events);
});

app.post('/api/admin/sponsors', authenticateToken, isManagerOrAdmin, (req, res) => {
	console.log('Sponsor creation request body:', req.body);
	const { name, description, logo, url, contact, contact_email, contact_phone, country } = req.body;
	try {
		const info = db.prepare(`
			INSERT INTO sponsors (name, description, logo, url, contact, contact_email, contact_phone, country, company_id)
			VALUES (@name, @description, @logo, @url, @contact, @contact_email, @contact_phone, @country, @company_id)
		`).run({
			name: req.body.name || null,
			description: req.body.description || null,
			logo: req.body.logo || null,
			url: req.body.url || null,
			contact: req.body.contact || null,
			contact_email: req.body.contact_email || null,
			contact_phone: req.body.contact_phone || null,
			country: req.body.country || null,
			company_id: req.user.company_id
		});
		res.json({ id: info.lastInsertRowid });
	} catch (err) {
		console.error('Error creating sponsor:', err);
		res.status(500).json({ message: 'Error creating sponsor: ' + err.message });
	}
});

app.put('/api/admin/sponsors/:id', authenticateToken, isManagerOrAdmin, (req, res) => {
	const { name, description, logo, url, contact, contact_email, contact_phone, country } = req.body;
	const sponsor = db.prepare('SELECT company_id FROM sponsors WHERE id = ?').get(req.params.id);
	if (!sponsor || sponsor.company_id !== req.user.company_id) return res.status(404).json({ message: 'Sponsor not found' });
	try {
		db.prepare(`
			UPDATE sponsors SET name = ?, description = ?, logo = ?, url = ?, contact = ?, contact_email = ?, contact_phone = ?, country = ?
			WHERE id = ? AND company_id = ?
		`).run(name, description, logo, url, contact, contact_email, contact_phone, country, req.params.id, req.user.company_id);
		res.json({ success: true });
	} catch (err) {
		res.status(400).json({ message: 'Update failed: ' + err.message });
	}
});

app.delete('/api/admin/sponsors/:id', authenticateToken, isManagerOrAdmin, (req, res) => {
	const sponsor = db.prepare('SELECT company_id FROM sponsors WHERE id = ?').get(req.params.id);
	if (!sponsor || sponsor.company_id !== req.user.company_id) return res.status(404).json({ message: 'Sponsor not found' });
	try {
		db.prepare('DELETE FROM sponsors WHERE id = ? AND company_id = ?').run(req.params.id, req.user.company_id);
		res.json({ success: true });
	} catch (err) {
		res.status(400).json({ message: 'Delete failed' });
	}
});

// Event Guests Management (registrant guests via guests + events_guests)
app.get('/api/admin/events/:id/guests', authenticateToken, isManagerOrAdmin, (req, res) => {
	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(req.params.id);
	if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });

	const baseGuests = db.prepare(`
		SELECT g.id, g.email, g.creation_date,
			eg.invited, eg.invited_date, eg.accepted, eg.accepted_date,
			eg.attended, eg.attended_date, eg.invitation_code
		FROM guests g
		JOIN events_guests eg ON g.id = eg.guest_id
		WHERE eg.event_id = ?
	`).all(req.params.id);

	const guests = baseGuests.map(g => {
		const rows = db.prepare(`
			SELECT f.field_name, gd.field_value
			FROM guestdata gd JOIN fields f ON gd.field_id = f.id
			WHERE gd.guest_id = ? AND f.event_id = ?
		`).all(g.id, req.params.id);
		const obj = { ...g, name: '', surname: '', role: '', organization: '', city: '', country: '', gender: '' };
		rows.forEach(r => { obj[r.field_name] = r.field_value; });
		return obj;
	});
	res.json(guests);
});

app.delete('/api/admin/events/:id/guests/:guestId', authenticateToken, isManagerOrAdmin, (req, res) => {
	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(req.params.id);
	if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });
	db.prepare('DELETE FROM events_guests WHERE event_id = ? AND guest_id = ?').run(req.params.id, req.params.guestId);
	res.json({ success: true });
});

// Event Sponsors Management
app.get('/api/admin/events/:id/sponsors', authenticateToken, isManagerOrAdmin, (req, res) => {
	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(req.params.id);
	if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });

	const sponsors = db.prepare(`
		SELECT s.* FROM sponsors s
		JOIN events_sponsors es ON s.id = es.sponsor_id
		WHERE es.event_id = ? AND s.company_id = ?
	`).all(req.params.id, req.user.company_id);
	res.json(sponsors);
});

app.get('/api/admin/events/:id/available-sponsors', authenticateToken, isManagerOrAdmin, (req, res) => {
	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(req.params.id);
	if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });

	const sponsors = db.prepare(`
		SELECT * FROM sponsors 
		WHERE company_id = ?
		AND id NOT IN (SELECT sponsor_id FROM events_sponsors WHERE event_id = ?)
	`).all(req.user.company_id, req.params.id);
	res.json(sponsors);
});

app.post('/api/admin/events/:id/sponsors', authenticateToken, isManagerOrAdmin, (req, res) => {
	const { sponsorIds } = req.body;
	const eventId = req.params.id;

	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(eventId);
	if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });

	// Validate target sponsors belong to same company
	const stmtCheck = db.prepare('SELECT company_id FROM sponsors WHERE id = ?');
	for (const sponsorId of sponsorIds) {
		const targetSponsor = stmtCheck.get(sponsorId);
		if (!targetSponsor || targetSponsor.company_id !== req.user.company_id) {
			return res.status(403).json({ message: 'Unauthorized sponsor addition' });
		}
	}

	const insert = db.prepare(`
		INSERT INTO events_sponsors (sponsor_id, event_id)
		VALUES (?, ?)
	`);

	const transaction = db.transaction((ids) => {
		for (const sponsorId of ids) {
			insert.run(sponsorId, eventId);
		}
	});

	try {
		transaction(sponsorIds);
		res.json({ success: true });
	} catch (err) {
		console.error('Error adding sponsors to event:', err);
		res.status(400).json({ message: 'Error adding sponsors: ' + err.message });
	}
});

app.delete('/api/admin/events/:id/sponsors/:sponsorId', authenticateToken, isManagerOrAdmin, (req, res) => {
	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(req.params.id);
	if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });

	db.prepare('DELETE FROM events_sponsors WHERE event_id = ? AND sponsor_id = ?')
		.run(req.params.id, req.params.sponsorId);
	res.json({ success: true });
});

app.post('/api/admin/events/:id/guests/import', authenticateToken, isManagerOrAdmin, upload.single('file'), (req, res) => {
	if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

	const fs = require('fs');
	const iconv = require('iconv-lite');
	const jschardet = require('jschardet');
	const buffer = fs.readFileSync(req.file.path);

	const detection = jschardet.detect(buffer);
	let fileContent = iconv.decode(buffer, detection.encoding || 'utf8');

	// Strip BOM if present
	if (fileContent.charCodeAt(0) === 0xFEFF) {
		fileContent = fileContent.slice(1);
	}

	const lines = fileContent.split(/\r?\n/);
	const header = lines[0].split(',').map(h => h.trim().toLowerCase());

	const errors = [];
	const importedCount = 0;
	const eventId = req.params.id;

	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(eventId);
	if (!event || event.company_id !== req.user.company_id) {
		return res.status(404).json({ message: 'Event not found' });
	}

	const findGuest = db.prepare('SELECT id FROM guests WHERE email = ?');
	const createGuest = db.prepare('INSERT INTO guests (email) VALUES (?)');
	const getFields = db.prepare('SELECT id, field_name FROM fields WHERE event_id = ?');
	const upsertData = db.prepare(`
		INSERT INTO guestdata (guest_id, field_id, field_value)
		VALUES (?, ?, ?)
		ON CONFLICT(guest_id, field_id) DO UPDATE SET field_value = excluded.field_value, updated_at = CURRENT_TIMESTAMP
	`);
	const assignToEvent = db.prepare(`
		INSERT OR IGNORE INTO events_guests (guest_id, event_id, invitation_code)
		VALUES (?, ?, ?)
	`);

	const eventFields = getFields.all(eventId);

	const transaction = db.transaction(() => {
		for (let i = 1; i < lines.length; i++) {
			if (!lines[i].trim()) continue;

			const values = lines[i].split(',').map(v => v.trim());
			const row = {};
			header.forEach((h, index) => row[h] = values[index]);

			if (!row.email) {
				errors.push(`Line ${i + 1}: Missing email`);
				continue;
			}

			let guestId;
			const existing = findGuest.get(row.email);
			if (existing) {
				guestId = existing.id;
			} else {
				const info = createGuest.run(row.email);
				guestId = info.lastInsertRowid;
			}

			const invitationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
			assignToEvent.run(guestId, eventId, invitationCode);

			// Insert field data (name, surname, email and any extras)
			eventFields.forEach(field => {
				const val = row[field.field_name];
				if (val !== undefined) upsertData.run(guestId, field.id, val);
			});
		}
	});

	try {
		transaction();
		fs.unlinkSync(req.file.path);
		res.json({ success: true, errors });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Import failed' });
	}
});

// Public Routes - Guest Confirmation
app.get('/api/public/confirmation/:code', (req, res) => {
	const row = db.prepare(`
		SELECT g.id as guest_id, g.email, e.id as event_id, e.name as event_name, e.city, e.country, e.date, eg.accepted, eg.invitation_code
		FROM guests g
		JOIN events_guests eg ON g.id = eg.guest_id
		JOIN events e ON eg.event_id = e.id
		WHERE eg.invitation_code = ?
	`).get(req.params.code);

	if (!row) return res.status(404).json({ message: 'Invalid invitation code' });
	if (row.accepted) return res.status(400).json({ message: 'This invitation has already been used and confirmed.' });

	// Enrich with field data
	const fieldRows = db.prepare(`
		SELECT f.field_name, gd.field_value
		FROM guestdata gd JOIN fields f ON gd.field_id = f.id
		WHERE gd.guest_id = ? AND f.event_id = ?
	`).all(row.guest_id, row.event_id);
	const data = { ...row, name: '', surname: '', role: '', organization: '', city: '', country: '', gender: '' };
	fieldRows.forEach(r => { data[r.field_name] = r.field_value; });
	res.json(data);
});

app.post('/api/public/confirm', async (req, res) => {
	const { code, userData } = req.body;
	const invitation = db.prepare(`
		SELECT eg.guest_id, eg.event_id, eg.accepted, g.email, eg.invitation_code
		FROM events_guests eg
		JOIN guests g ON eg.guest_id = g.id
		WHERE eg.invitation_code = ?
	`).get(code);

	if (!invitation) return res.status(404).json({ message: 'Invalid code' });
	if (invitation.accepted) return res.status(400).json({ message: 'Invitation already confirmed' });

	const event = db.prepare('SELECT * FROM events WHERE id = ?').get(invitation.event_id);

	// Upsert field data (name, surname, etc.) into guestdata
	const fields = db.prepare('SELECT id, field_name FROM fields WHERE event_id = ?').all(invitation.event_id);
	const upsert = db.prepare(`
		INSERT INTO guestdata (guest_id, field_id, field_value)
		VALUES (?, ?, ?)
		ON CONFLICT(guest_id, field_id) DO UPDATE SET field_value = excluded.field_value, updated_at = CURRENT_TIMESTAMP
	`);
	fields.forEach(f => {
		if (userData[f.field_name] !== undefined) upsert.run(invitation.guest_id, f.id, userData[f.field_name]);
	});

	// Mark as accepted
	db.prepare('UPDATE events_guests SET accepted = 1, accepted_date = CURRENT_TIMESTAMP WHERE invitation_code = ?').run(code);

	// Send Badge Email
	try {
		const guestForBadge = { ...userData, invitation_code: code };
		const badgeHtml = buildBadgeEmailHtml(guestForBadge, event);
		await axios.post(SENDPIGEON_API, {
			from: EMAIL_FROM,
			to: invitation.email,
			subject: `Confirmation & Digital Badge: ${event.name}`,
			html: badgeHtml,
		}, { headers: sendpigeonHeaders() });
	} catch (err) {
		console.error('Failed to send badge email:', err.message);
	}

	res.json({ success: true });
});

// Mobile App Routes - For Staff (Admins, Managers and Users)
app.get('/api/mobile/events', authenticateToken, isStaff, (req, res) => {
	if (req.user.type === 'admin') {
		const events = db.prepare(`
			SELECT * FROM events 
			WHERE status = 'active' AND company_id = ?
		`).all(req.user.company_id);
		return res.json(events);
	} else {
		const events = db.prepare(`
			SELECT e.* FROM events e
			JOIN events_users eu ON e.id = eu.event_id
			WHERE e.status = 'active' AND eu.user_id = ?
		`).all(req.user.id);
		return res.json(events);
	}
});

app.post('/api/mobile/validate', authenticateToken, isStaff, (req, res) => {
	const { invitationCode, eventId } = req.body;

	// Verify the event belongs to the same company
	const eventCheck = db.prepare('SELECT company_id FROM events WHERE id = ?').get(eventId);
	if (!eventCheck || eventCheck.company_id !== req.user.company_id) {
		return res.status(403).json({ message: 'You are not authorized to scan for this event' });
	}

	// Verify if the scanning staff member is assigned to this event (admins bypass)
	if (req.user.type !== 'admin') {
		const isAssigned = db.prepare('SELECT 1 FROM events_users WHERE user_id = ? AND event_id = ?').get(req.user.id, eventId);
		if (!isAssigned) {
			return res.status(403).json({ message: 'You are not assigned to this event' });
		}
	}

	// Look up the guest by invitation code in events_guests
	const guestInfo = db.prepare(`
		SELECT gd_name.field_value as name, gd_surname.field_value as surname, e.name as event_name
		FROM events_guests eg
		JOIN events e ON eg.event_id = e.id
		LEFT JOIN fields f_name ON f_name.event_id = e.id AND f_name.field_name = 'name'
		LEFT JOIN guestdata gd_name ON gd_name.guest_id = eg.guest_id AND gd_name.field_id = f_name.id
		LEFT JOIN fields f_surname ON f_surname.event_id = e.id AND f_surname.field_name = 'surname'
		LEFT JOIN guestdata gd_surname ON gd_surname.guest_id = eg.guest_id AND gd_surname.field_id = f_surname.id
		WHERE eg.invitation_code = ? AND eg.event_id = ?
	`).get(invitationCode, eventId);

	if (!guestInfo) return res.status(404).json({ message: 'Invalid badge' });

	db.prepare('UPDATE events_guests SET attended = 1, attended_date = CURRENT_TIMESTAMP WHERE invitation_code = ? AND event_id = ?').run(invitationCode, eventId);

	res.json({
		success: true,
		message: 'Attendance validated',
		guestName: `${guestInfo.name || ''} ${guestInfo.surname || ''}`.trim(),
		eventName: guestInfo.event_name
	});
});

// ─── Superadmin Routes ───────────────────────────────────────────────────────
app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
