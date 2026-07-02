require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const { Op, Sequelize } = require('sequelize');

const {
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
} = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

const isEventAssigned = async (req, res, next) => {
	const eventId = req.params.eventId || req.params.id;
	if (!eventId) return next();

	if (req.user.type === 'manager') {
		const assigned = await EventUser.findOne({
			where: {
				user_id: req.user.id,
				event_id: eventId
			}
		});
		if (!assigned) {
			return res.status(403).json({ message: 'Access denied. You are not assigned to this event.' });
		}
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
app.get('/api/superadmin/companies', authenticateToken, isSuperAdmin, async (req, res) => {
	try {
		// Use subqueries for database-agnostic counting
		const companies = await Company.findAll({
			attributes: {
				include: [
					[
						sequelize.literal(`(
							SELECT COUNT(DISTINCT u.id)
							FROM users u
							WHERE u.company_id = "Company".id AND u.type != 'guest'
						)`),
						'user_count'
					],
					[
						sequelize.literal(`(
							SELECT COUNT(DISTINCT e.id)
							FROM events e
							WHERE e.company_id = "Company".id
						)`),
						'event_count'
					]
				]
			},
			order: [['name', 'ASC']]
		});

		const admins = await User.findAll({
			where: { type: 'admin' },
			attributes: ['id', 'company_id', 'name', 'surname', 'email', 'role']
		});

		const companiesWithAdmin = companies.map(c => {
			const companyData = c.toJSON();
			// Convert subquery string results to numbers if necessary
			companyData.user_count = parseInt(companyData.user_count || 0, 10);
			companyData.event_count = parseInt(companyData.event_count || 0, 10);
			return {
				...companyData,
				admin: admins.find(admin => admin.company_id === companyData.id) || null,
			};
		});

		res.json(companiesWithAdmin);
	} catch (err) {
		console.error('Error fetching companies:', err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

// GET single company
app.get('/api/superadmin/companies/:id', authenticateToken, isSuperAdmin, async (req, res) => {
	try {
		const company = await Company.findByPk(req.params.id);
		if (!company) return res.status(404).json({ message: 'Company not found' });
		res.json(company);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

// POST create company + initial admin user
app.post('/api/superadmin/companies', authenticateToken, isSuperAdmin, async (req, res) => {
	const { name, logo, address, email, phone, city, country, admin } = req.body;

	if (!name) return res.status(400).json({ message: 'Company name is required' });
	if (!admin || !admin.name || !admin.surname || !admin.email || !admin.password) {
		return res.status(400).json({ message: 'Admin user details (name, surname, email, password) are required' });
	}

	try {
		const result = await sequelize.transaction(async (t) => {
			const company = await Company.create({
				name,
				logo: logo || null,
				address: address || null,
				email: email || null,
				phone: phone || null,
				city: city || null,
				country: country || null
			}, { transaction: t });

			const hashedPassword = bcrypt.hashSync(admin.password, 10);

			const user = await User.create({
				name: admin.name,
				surname: admin.surname,
				email: admin.email,
				password: hashedPassword,
				type: 'admin',
				role: admin.role || null,
				company_id: company.id
			}, { transaction: t });

			return { companyId: company.id, adminId: user.id };
		});

		res.json({ success: true, companyId: result.companyId, adminId: result.adminId });
	} catch (err) {
		console.error('Error creating company:', err);
		res.status(400).json({ message: err.message || 'Failed to create company' });
	}
});

// PUT update company info
app.put('/api/superadmin/companies/:id', authenticateToken, isSuperAdmin, async (req, res) => {
	const { name, logo, address, email, phone, city, country, admin } = req.body;

	try {
		const company = await Company.findByPk(req.params.id);
		if (!company) return res.status(404).json({ message: 'Company not found' });

		const adminUser = await User.findOne({
			where: {
				company_id: req.params.id,
				type: 'admin'
			}
		});
		if (!adminUser) return res.status(404).json({ message: 'Admin user not found' });

		await sequelize.transaction(async (t) => {
			await company.update({
				name,
				logo: logo || null,
				address: address || null,
				email: email || null,
				phone: phone || null,
				city: city || null,
				country: country || null
			}, { transaction: t });

			const adminUpdateData = {
				name: admin.name,
				surname: admin.surname,
				email: admin.email,
				role: admin.role || null
			};

			if (admin.password && admin.password.length > 0) {
				adminUpdateData.password = bcrypt.hashSync(admin.password, 10);
			}

			await adminUser.update(adminUpdateData, { transaction: t });
		});

		res.json({ success: true });
	} catch (err) {
		console.error(err);
		res.status(400).json({ message: 'Update failed: ' + err.message });
	}
});

// DELETE company + all associated data
app.delete('/api/superadmin/companies/:id', authenticateToken, isSuperAdmin, async (req, res) => {
	try {
		const company = await Company.findByPk(req.params.id);
		if (!company) return res.status(404).json({ message: 'Company not found' });

		await sequelize.transaction(async (t) => {
			const events = await Event.findAll({
				where: { company_id: req.params.id },
				attributes: ['id'],
				transaction: t
			});
			const eventIds = events.map(e => e.id);

			if (eventIds.length > 0) {
				await EventGuest.destroy({ where: { event_id: { [Op.in]: eventIds } }, transaction: t });
				await EventUser.destroy({ where: { event_id: { [Op.in]: eventIds } }, transaction: t });
				await EventSponsor.destroy({ where: { event_id: { [Op.in]: eventIds } }, transaction: t });
				await Field.destroy({ where: { event_id: { [Op.in]: eventIds } }, transaction: t });
			}

			await Event.destroy({ where: { company_id: req.params.id }, transaction: t });
			await Sponsor.destroy({ where: { company_id: req.params.id }, transaction: t });
			await User.destroy({ where: { company_id: req.params.id }, transaction: t });
			await company.destroy({ transaction: t });
		});

		res.json({ success: true });
	} catch (err) {
		console.error('Error deleting company:', err);
		res.status(500).json({ message: 'Delete failed: ' + err.message });
	}
});

// GET users of a specific company (for superadmin view)
app.get('/api/superadmin/companies/:id/users', authenticateToken, isSuperAdmin, async (req, res) => {
	try {
		const users = await User.findAll({
			where: {
				company_id: req.params.id,
				type: { [Op.ne]: 'guest' }
			},
			attributes: ['id', 'name', 'surname', 'email', 'type', 'role', 'creation_date'],
			order: [['type', 'ASC']]
		});
		res.json(users);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

// ─── Auth Routes ───────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
	const { email, password } = req.body;
	try {
		const user = await User.findOne({ where: { email } });

		if (!user || !bcrypt.compareSync(password, user.password)) {
			return res.status(401).json({ message: 'Invalid credentials' });
		}

		if (user.type !== 'admin' && user.type !== 'user' && user.type !== 'manager' && user.type !== 'superadmin') {
			return res.status(403).json({ message: 'Access denied. Unauthorized account type.' });
		}

		const token = jwt.sign({ id: user.id, email: user.email, type: user.type, company_id: user.company_id }, JWT_SECRET, { expiresIn: '24h' });
		res.json({
			token,
			user: {
				id: user.id,
				name: user.name,
				surname: user.surname,
				email: user.email,
				role: user.role,
				type: user.type,
				company_id: user.company_id
			}
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
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

// GET Company info for the logged-in user (both /company and /companies are supported)
app.get(['/api/admin/companies', '/api/admin/company'], authenticateToken, isStaff, async (req, res) => {
	try {
		const company = await Company.findByPk(req.user.company_id);
		res.json(company || {});
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

// PUT update company info for the logged-in user
app.put('/api/admin/companies', authenticateToken, isStaff, async (req, res) => {
	const { name, logo, address, email, phone, city, country } = req.body;
	try {
		const company = await Company.findByPk(req.user.company_id);
		if (!company) return res.status(404).json({ message: 'Company not found' });

		await company.update({
			name,
			logo: logo || null,
			address: address || null,
			email: email || null,
			phone: phone || null,
			city: city || null,
			country: country || null
		});
		res.json({ success: true });
	} catch (err) {
		res.status(400).json({ message: 'Update failed: ' + err.message });
	}
});

// GET Users
app.get('/api/admin/users', authenticateToken, isManagerOrAdmin, async (req, res) => {
	const type = req.query.type;
	try {
		let users;
		if (type) {
			users = await User.findAll({
				where: {
					type: type,
					company_id: req.user.company_id
				},
				order: [['surname', 'ASC']]
			});
		} else {
			users = await User.findAll({
				where: {
					company_id: req.user.company_id,
					type: { [Op.ne]: 'admin' }
				},
				order: [['surname', 'ASC']]
			});
		}

		const enrichedUsers = await Promise.all(users.map(async (user) => {
			const assigned = await Event.findAll({
				include: [{
					model: User,
					as: 'assignedUsers',
					where: { id: user.id },
					attributes: []
				}],
				attributes: ['name']
			});
			return {
				...user.toJSON(),
				assignedEvents: assigned.map(e => e.name)
			};
		}));

		res.json(enrichedUsers);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

// GET single user
app.get('/api/admin/users/:id', authenticateToken, isStaff, async (req, res) => {
	try {
		const user = await User.findByPk(req.params.id, {
			attributes: { exclude: ['password'] }
		});
		if (!user) return res.status(404).json({ message: 'User not found' });

		// Ensure user belongs to the same company
		if (req.user.type !== 'superadmin' && user.company_id !== req.user.company_id) {
			return res.status(403).json({ message: 'Access denied' });
		}

		res.json(user);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

// POST Create User (Managers & Guests)
app.post('/api/admin/users', authenticateToken, isManagerOrAdmin, async (req, res) => {
	const { name, surname, email, type, password, role } = req.body;

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
		const user = await User.create({
			name,
			surname,
			email,
			role,
			type: type || 'guest',
			password: hashedPassword,
			company_id: req.user.company_id
		});
		res.json({ id: user.id });
	} catch (err) {
		console.error('Error creating user:', err);
		res.status(400).json({ message: 'User already exists or invalid data' });
	}
});

// PUT Update User (Managers & Guests)
app.put('/api/admin/users/:id', authenticateToken, isManagerOrAdmin, async (req, res) => {
	const { name, surname, email, type, role, password } = req.body;

	try {
		const userToEdit = await User.findByPk(req.params.id);
		if (!userToEdit || userToEdit.company_id !== req.user.company_id) {
			return res.status(404).json({ message: 'User not found' });
		}

		if (req.user.type === 'manager') {
			if (parseInt(req.params.id, 10) !== req.user.id && userToEdit.type !== 'user') {
				return res.status(403).json({ message: 'Managers can only edit users of type "user"' });
			}
			if (type && type !== userToEdit.type) {
				return res.status(403).json({ message: 'Managers cannot change user roles' });
			}
		}

		if (parseInt(req.params.id, 10) === req.user.id) {
			if (type && type !== userToEdit.type) {
				return res.status(400).json({ message: 'You cannot change your own account permission.' });
			}
		}

		if (req.user.type === 'admin' && (type === 'superadmin' || userToEdit.type === 'superadmin')) {
			return res.status(403).json({ message: 'Admins cannot modify or assign superadmin privileges' });
		}

		if (type === 'admin') {
			const existingAdmin = await User.findOne({
				where: {
					type: 'admin',
					company_id: req.user.company_id,
					id: { [Op.ne]: req.params.id }
				}
			});
			if (existingAdmin) {
				return res.status(400).json({ message: 'There can only be one admin user per company.' });
			}
		}

		const updateData = { name, surname, email, type, role };
		if (password) {
			updateData.password = bcrypt.hashSync(password, 10);
		}

		await userToEdit.update(updateData);
		res.json({ success: true });
	} catch (err) {
		res.status(400).json({ message: 'Update failed: ' + err.message });
	}
});

app.delete('/api/admin/users/:id', authenticateToken, isManagerOrAdmin, async (req, res) => {
	try {
		const userToDelete = await User.findByPk(req.params.id);
		if (!userToDelete || userToDelete.company_id !== req.user.company_id) {
			return res.status(404).json({ message: 'User not found' });
		}

		if (req.user.type === 'manager' && userToDelete.type !== 'user') {
			return res.status(403).json({ message: 'Managers can only delete users of type "user"' });
		}

		if (userToDelete.type === 'superadmin') {
			return res.status(403).json({ message: 'Superadmin cannot be deleted' });
		}

		await userToDelete.destroy();
		res.json({ success: true });
	} catch (err) {
		res.status(400).json({ message: 'Delete failed' });
	}
});

// User-Event Assignment Routes (staff: managers & users)
app.get('/api/admin/users/:id/events', authenticateToken, isManagerOrAdmin, async (req, res) => {
	const targetUserId = parseInt(req.params.id, 10);
	try {
		const targetUser = await User.findByPk(targetUserId);
		if (!targetUser || targetUser.company_id !== req.user.company_id) {
			return res.status(404).json({ message: 'User not found' });
		}
		if (req.user.type === 'manager' && targetUser.type !== 'user' && targetUserId !== req.user.id) {
			return res.status(403).json({ message: 'Managers can only view events for themselves or "user" type accounts' });
		}

		let events;
		if (req.user.type === 'manager' && targetUserId !== req.user.id) {
			// Manager viewing another user's events: only show events the manager is also assigned to
			events = await Event.findAll({
				where: {
					status: { [Op.in]: ['not active', 'active'] },
					company_id: req.user.company_id
				},
				include: [
					{
						model: User,
						as: 'assignedUsers',
						where: { id: req.user.id },
						attributes: [],
						required: true
					}
				],
				order: [['date', 'DESC']]
			});
		} else {
			// Admin or manager viewing their own events: show all company events
			events = await Event.findAll({
				where: {
					status: { [Op.in]: ['not active', 'active'] },
					company_id: req.user.company_id
				},
				order: [['date', 'DESC']]
			});
		}

		// Map to see if the target user is assigned
		const targetAssignments = await EventUser.findAll({
			where: { user_id: targetUserId }
		});
		const assignedEventIds = new Set(targetAssignments.map(a => a.event_id));

		const result = events.map(e => {
			const eventData = e.toJSON();
			return {
				...eventData,
				assigned: assignedEventIds.has(e.id) ? 1 : 0
			};
		});

		res.json(result);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

app.post('/api/admin/users/:id/events/:eventId', authenticateToken, isManagerOrAdmin, async (req, res) => {
	const { id, eventId } = req.params;
	try {
		const targetUser = await User.findByPk(id);
		const targetEvent = await Event.findByPk(eventId);
		if (!targetUser || targetUser.company_id !== req.user.company_id || !targetEvent || targetEvent.company_id !== req.user.company_id) {
			return res.status(403).json({ message: 'Unauthorized access' });
		}
		if (req.user.type === 'manager') {
			if (targetUser.type !== 'user') {
				return res.status(403).json({ message: 'Managers can only manage event assignments for "user" type accounts' });
			}
			const managerAssigned = await EventUser.findOne({
				where: { user_id: req.user.id, event_id: eventId }
			});
			if (!managerAssigned) {
				return res.status(403).json({ message: 'Managers can only assign users to events they themselves belong to' });
			}
		}

		await EventUser.findOrCreate({
			where: { user_id: id, event_id: eventId }
		});
		res.json({ success: true });
	} catch (err) {
		res.status(400).json({ message: 'Error assigning event: ' + err.message });
	}
});

app.delete('/api/admin/users/:id/events/:eventId', authenticateToken, isManagerOrAdmin, async (req, res) => {
	const { id, eventId } = req.params;
	try {
		const targetUser = await User.findByPk(id);
		const targetEvent = await Event.findByPk(eventId);
		if (!targetUser || targetUser.company_id !== req.user.company_id || !targetEvent || targetEvent.company_id !== req.user.company_id) {
			return res.status(403).json({ message: 'Unauthorized access' });
		}
		if (req.user.type === 'manager') {
			if (targetUser.type !== 'user') {
				return res.status(403).json({ message: 'Managers can only manage event assignments for "user" type accounts' });
			}
			const managerAssigned = await EventUser.findOne({
				where: { user_id: req.user.id, event_id: eventId }
			});
			if (!managerAssigned) {
				return res.status(403).json({ message: 'Managers can only unassign users from events they themselves belong to' });
			}
		}

		await EventUser.destroy({
			where: { user_id: id, event_id: eventId }
		});
		res.json({ success: true });
	} catch (err) {
		res.status(400).json({ message: 'Error unassigning event: ' + err.message });
	}
});

app.post('/api/admin/guests/:id/send', authenticateToken, isManagerOrAdmin, async (req, res) => {
	try {
		const guest = await Guest.findOne({
			include: [{
				model: Event,
				as: 'events',
				where: { company_id: req.user.company_id },
				required: true
			}],
			where: { id: req.params.id }
		});
		if (!guest) return res.status(404).json({ message: 'Guest not found' });
		res.json({ success: true, message: 'Invitation email sent' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

app.get('/api/admin/guests', authenticateToken, isManagerOrAdmin, async (req, res) => {
	try {
		const guests = await Guest.findAll({
			include: [{
				model: Event,
				as: 'events',
				where: { company_id: req.user.company_id },
				attributes: [],
				required: true
			}],
			attributes: [
				'id', 'email', 'creation_date',
				[sequelize.literal('(SELECT COUNT(*) FROM events_guests WHERE events_guests.guest_id = "Guest".id)'), 'event_count']
			],
			group: ['Guest.id']
		});

		const enrichedGuests = await Promise.all(guests.map(async (g) => {
			const guestDataRows = await GuestData.findAll({
				where: { guest_id: g.id },
				include: [{ model: Field, as: 'field', attributes: ['field_name'] }]
			});

			let guestObj = {
				id: g.id,
				email: g.email,
				creation_date: g.creation_date,
				event_count: parseInt(g.getDataValue('event_count') || 0, 10),
				name: '', surname: '', organization: '', role: '', city: '', country: '', gender: ''
			};

			guestDataRows.forEach(row => {
				if (row.field) {
					guestObj[row.field.field_name] = row.field_value;
				}
			});
			return guestObj;
		}));

		res.json(enrichedGuests);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

app.get('/api/admin/guests/:id/events', authenticateToken, isManagerOrAdmin, async (req, res) => {
	try {
		const eventGuests = await EventGuest.findAll({
			where: { guest_id: req.params.id },
			include: [{
				model: Event,
				as: 'event',
				where: { company_id: req.user.company_id },
				attributes: ['name', 'date']
			}],
			attributes: ['invited_date', 'accepted_date', 'attended_date']
		});

		const events = eventGuests.map((entry) => ({
			name: entry.event?.name,
			date: entry.event?.date,
			invited: Boolean(entry.invited_date),
			accepted: Boolean(entry.accepted_date),
			attended: Boolean(entry.attended_date)
		}));
		res.json(events);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

app.post('/api/admin/events/:eventId/guests/create', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	const { eventId } = req.params;
	const { guestData } = req.body;

	try {
		const event = await Event.findByPk(eventId);
		if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });
		if (event.status !== 'active') return res.status(400).json({ message: 'It is only possible to add guests when the event is Active' });

		await sequelize.transaction(async (t) => {
			let [guest] = await Guest.findOrCreate({
				where: { email: guestData.email },
				transaction: t
			});

			const invitationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
			await EventGuest.findOrCreate({
				where: { guest_id: guest.id, event_id: eventId },
				defaults: { invitation_code: invitationCode },
				transaction: t
			});

			const fields = await Field.findAll({ where: { event_id: eventId }, transaction: t });
			for (const field of fields) {
				if (guestData[field.field_name] !== undefined) {
					await GuestData.upsert({
						guest_id: guest.id,
						field_id: field.id,
						field_value: guestData[field.field_name]
					}, { transaction: t });
				}
			}
		});

		res.json({ success: true });
	} catch (err) {
		console.error('Error creating guest:', err);
		res.status(400).json({ message: 'Error creating guest: ' + err.message });
	}
});

app.post('/api/admin/events/:eventId/guests', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	const { eventId } = req.params;
	const { guestIds } = req.body;

	try {
		const event = await Event.findByPk(eventId);
		if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });
		if (event.status !== 'active') return res.status(400).json({ message: 'It is only possible to add guests when the event is Active' });

		await sequelize.transaction(async (t) => {
			for (const guestId of guestIds) {
				const invitationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
				await EventGuest.findOrCreate({
					where: { guest_id: guestId, event_id: eventId },
					defaults: { invitation_code: invitationCode },
					transaction: t
				});
			}
		});

		res.json({ success: true });
	} catch (err) {
		res.status(400).json({ message: 'Error assigning guests: ' + err.message });
	}
});

// Admin Routes - Events
app.get('/api/admin/events', authenticateToken, isManagerOrAdmin, async (req, res) => {
	try {
		let events;
		if (req.user.type === 'manager') {
			events = await Event.findAll({
				include: [{
					model: User,
					as: 'assignedUsers',
					where: { id: req.user.id },
					attributes: [],
					required: true
				}],
				where: { company_id: req.user.company_id }
			});
		} else {
			events = await Event.findAll({
				where: { company_id: req.user.company_id },
				order: [['date']]
			});
		}
		res.json(events);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

app.get('/api/admin/events/:id', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	try {
		const event = await Event.findOne({
			where: { id: req.params.id, company_id: req.user.company_id }
		});
		if (!event) return res.status(404).json({ message: 'Event not found' });
		res.json(event);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
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

app.post('/api/admin/events/:id/guests/:guestId/invite', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	try {
		const event = await Event.findOne({
			where: { id: req.params.id, company_id: req.user.company_id }
		});
		if (!event) return res.status(404).json({ message: 'Event not found' });
		if (!event.email_template) return res.status(400).json({ message: 'No email template set for this event' });

		const eg = await EventGuest.findOne({
			where: { guest_id: req.params.guestId, event_id: req.params.id }
		});
		const g = await Guest.findByPk(req.params.guestId);
		if (!eg || !g) return res.status(404).json({ message: 'Guest not found' });

		const guestDataRows = await GuestData.findAll({
			where: { guest_id: req.params.guestId },
			include: [{ model: Field, as: 'field', where: { event_id: req.params.id } }]
		});

		let guest = {
			id: g.id,
			email: g.email,
			invitation_code: eg.invitation_code
		};
		guestDataRows.forEach(row => {
			if (row.field) {
				guest[row.field.field_name] = row.field_value;
			}
		});

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

		await eg.update({ invited_date: new Date() });
		res.json({ success: true });
	} catch (err) {
		const msg = err.response?.data?.message || err.message;
		res.status(500).json({ message: 'Failed to send invitation: ' + msg });
	}
});

// Invite all guests in an event (uses batch API — up to 100 per call)
app.post('/api/admin/events/:id/invite-all', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	try {
		const event = await Event.findOne({
			where: { id: req.params.id, company_id: req.user.company_id }
		});
		if (!event) return res.status(404).json({ message: 'Event not found' });
		if (!event.email_template) return res.status(400).json({ message: 'No email template set for this event' });

		const eventGuests = await EventGuest.findAll({
			where: { event_id: req.params.id }
		});
		const guestIds = eventGuests.map(eg => eg.guest_id);
		if (guestIds.length === 0) return res.json({ success: true, sent: 0, errors: [] });

		const baseGuests = await Guest.findAll({
			where: { id: { [Op.in]: guestIds } }
		});

		const guests = await Promise.all(baseGuests.map(async (g) => {
			const eg = eventGuests.find(eg => eg.guest_id === g.id);
			const guestDataRows = await GuestData.findAll({
				where: { guest_id: g.id },
				include: [{ model: Field, as: 'field', where: { event_id: req.params.id } }]
			});

			let guestObj = {
				id: g.id,
				email: g.email,
				invitation_code: eg ? eg.invitation_code : ''
			};
			guestDataRows.forEach(row => {
				if (row.field) {
					guestObj[row.field.field_name] = row.field_value;
				}
			});
			return guestObj;
		}));

		const emails = guests.map(guest => ({
			from: EMAIL_FROM,
			to: guest.email,
			subject: `You are invited to ${event.name}`,
			html: buildEmailHtml(event.email_template, guest, event, guest.invitation_code),
		}));

		const response = await axios.post(`${SENDPIGEON_API}/batch`, { emails }, { headers: sendpigeonHeaders() });
		const results = response.data?.data || [];
		const errors = results
			.filter(r => r.status === 'failed')
			.map(r => ({ guest: guests[r.index]?.email, error: 'Delivery failed' }));

		// Mark successfully sent guests as invited
		const successIndices = results.filter(r => r.status !== 'failed').map(r => r.index);
		const successGuestIds = successIndices.map(idx => guests[idx]?.id).filter(Boolean);

		if (successGuestIds.length > 0) {
			await EventGuest.update(
				{ invited_date: new Date() },
				{ where: { event_id: req.params.id, guest_id: { [Op.in]: successGuestIds } } }
			);
		}

		res.json({ success: true, sent: results.length - errors.length, errors });
	} catch (err) {
		const msg = err.response?.data?.message || err.message;
		res.status(500).json({ message: 'Failed to send invitations: ' + msg });
	}
});

app.post('/api/admin/events', authenticateToken, isManagerOrAdmin, async (req, res) => {
	const { name, city, country, date, email_template, status, logo } = req.body;

	if (!name || !name.trim()) return res.status(400).json({ message: 'Event name is required' });
	if (!date) return res.status(400).json({ message: 'Date is required' });
	if (!city || !city.trim()) return res.status(400).json({ message: 'City is required' });
	if (!country || !country.trim()) return res.status(400).json({ message: 'Country is required' });

	try {
		const eventId = await sequelize.transaction(async (t) => {
			const event = await Event.create({
				name,
				city: city || null,
				country: country || null,
				date: date || null,
				email_template: email_template || null,
				status: status || 'not active',
				logo: logo || null,
				company_id: req.user.company_id
			}, { transaction: t });

			await Field.create({ event_id: event.id, field_name: 'Name', field_type: 'text', field_order: 0, required: true, editable: false }, { transaction: t });
			await Field.create({ event_id: event.id, field_name: 'Surname', field_type: 'text', field_order: 1, required: true, editable: false }, { transaction: t });
			await Field.create({ event_id: event.id, field_name: 'Email', field_type: 'text', field_order: 2, required: true, editable: false }, { transaction: t });
			await Field.create({ event_id: event.id, field_name: 'City', field_type: 'text', field_order: 3, required: true, editable: false }, { transaction: t });
			await Field.create({ event_id: event.id, field_name: 'Country', field_type: 'country', field_order: 4, required: true, editable: false }, { transaction: t });

			if (req.user.type === 'manager') {
				await EventUser.create({ user_id: req.user.id, event_id: event.id }, { transaction: t });
			}

			return event.id;
		});

		res.json({ id: eventId });
	} catch (err) {
		console.error("Error creating event:", err);
		res.status(500).json({ message: 'Error creating event' });
	}
});

app.put('/api/admin/events/:id', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	const { name, city, country, date, email_template, status, logo } = req.body;
	try {
		const event = await Event.findOne({
			where: { id: req.params.id, company_id: req.user.company_id }
		});
		if (!event) return res.status(404).json({ message: 'Event not found' });

		await event.update({
			name,
			city: city || null,
			country: country || null,
			date: date || null,
			email_template: email_template || null,
			status: status || 'not active',
			logo: logo || null
		});

		res.json({ success: true });
	} catch (err) {
		res.status(400).json({ message: 'Update failed: ' + err.message });
	}
});

// DELETE Event + all associated data
app.delete('/api/admin/events/:id', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	try {
		const event = await Event.findOne({
			where: { id: req.params.id, company_id: req.user.company_id }
		});
		if (!event) return res.status(404).json({ message: 'Event not found' });

		const eventId = event.id;
		const logoPath = event.logo; // e.g. "/uploads/events/filename.jpg"

		await sequelize.transaction(async (t) => {
			// GuestData rows are cascade-deleted when Fields are deleted (field_id FK CASCADE)
			// EventGuest rows are also cascade-deleted when the Guest or Event is deleted,
			// but we destroy them explicitly to be safe
			await EventGuest.destroy({ where: { event_id: eventId }, transaction: t });
			await EventUser.destroy({ where: { event_id: eventId }, transaction: t });
			await EventSponsor.destroy({ where: { event_id: eventId }, transaction: t });
			// Fields have GuestData linked via field_id CASCADE, so destroying Fields also cleans GuestData
			await Field.destroy({ where: { event_id: eventId }, transaction: t });
			await event.destroy({ transaction: t });
		});

		// Delete logo file from disk after transaction succeeds
		if (logoPath) {
			const absolutePath = path.join(__dirname, logoPath);
			fs.unlink(absolutePath, (err) => {
				if (err) console.warn('Could not delete logo file:', absolutePath, err.message);
			});
		}

		res.json({ success: true });
	} catch (err) {
		console.error('Error deleting event:', err);
		res.status(500).json({ message: 'Delete failed: ' + err.message });
	}
});


app.get('/api/admin/events/:eventId/fields', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	try {
		const event = await Event.findOne({
			where: { id: req.params.eventId, company_id: req.user.company_id }
		});
		if (!event) return res.status(404).json({ message: 'Event not found' });

		const fields = await Field.findAll({
			where: { event_id: req.params.eventId },
			order: [['field_order', 'ASC']]
		});

		res.json(fields);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

app.post('/api/admin/events/:eventId/fields', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	const { field_name, field_type, field_values, required } = req.body;
	if (!field_name || !field_type) return res.status(400).json({ message: 'field_name and field_type required' });

	try {
		const event = await Event.findOne({
			where: { id: req.params.eventId, company_id: req.user.company_id }
		});
		if (!event) return res.status(404).json({ message: 'Event not found' });

		const maxOrder = await Field.max('field_order', { where: { event_id: req.params.eventId } });
		const nextOrder = (maxOrder !== null && maxOrder !== undefined) ? maxOrder + 1 : 0;

		const field = await Field.create({
			event_id: req.params.eventId,
			field_name,
			field_type,
			field_values: field_values || null,
			field_order: nextOrder,
			required: required ? true : false,
            editable: false
		});

		res.json({ id: field.id });
	} catch (err) {
		if (err.name === 'SequelizeUniqueConstraintError') {
			return res.status(400).json({ message: 'Field name already exists for this event' });
		}
		res.status(500).json({ message: 'Database error' });
	}
});

app.put('/api/admin/events/:eventId/fields/:fieldId', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	const { field_name, field_type, field_values, required } = req.body;

	try {
		const event = await Event.findOne({
			where: { id: req.params.eventId, company_id: req.user.company_id }
		});
		if (!event) return res.status(404).json({ message: 'Event not found' });

		const field = await Field.findOne({
			where: { id: req.params.fieldId, event_id: req.params.eventId }
		});
		if (!field) return res.status(404).json({ message: 'Field not found' });

		const updateData = {};
		if (field_name !== undefined) updateData.field_name = field_name;
		if (field_type !== undefined) updateData.field_type = field_type;
		if (field_values !== undefined) updateData.field_values = field_values;
		if (required !== undefined) updateData.required = required ? true : false;

		await field.update(updateData);
		res.json({ success: true });
	} catch (err) {
		if (err.name === 'SequelizeUniqueConstraintError') {
			return res.status(400).json({ message: 'Field name already exists for this event' });
		}
		res.status(500).json({ message: 'Database error' });
	}
});

app.delete('/api/admin/events/:eventId/fields/:fieldId', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	try {
		const event = await Event.findOne({
			where: { id: req.params.eventId, company_id: req.user.company_id }
		});
		if (!event) return res.status(404).json({ message: 'Event not found' });

		const field = await Field.findOne({
			where: { id: req.params.fieldId, event_id: req.params.eventId }
		});
		if (!field) return res.status(404).json({ message: 'Field not found' });

		await field.destroy();
		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ message: 'Database error' });
	}
});

app.post('/api/admin/events/:eventId/fields/reorder', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	const { fieldOrder } = req.body; // Array of field IDs in desired order
	if (!Array.isArray(fieldOrder)) return res.status(400).json({ message: 'fieldOrder must be an array' });

	try {
		const event = await Event.findOne({
			where: { id: req.params.eventId, company_id: req.user.company_id }
		});
		if (!event) return res.status(404).json({ message: 'Event not found' });

		await sequelize.transaction(async (t) => {
			for (let index = 0; index < fieldOrder.length; index++) {
				const fieldId = fieldOrder[index];
				await Field.update(
					{ field_order: index },
					{
						where: { id: fieldId, event_id: req.params.eventId },
						transaction: t
					}
				);
			}
		});

		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ message: 'Database error' });
	}
});

app.get('/api/admin/events/:eventId/field-templates', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	try {
		const event = await Event.findOne({
			where: { id: req.params.eventId, company_id: req.user.company_id }
		});
		if (!event) return res.status(404).json({ message: 'Event not found' });

		const templates = await Event.findAll({
			include: [{
				model: Field,
				as: 'fields',
				required: true,
				attributes: ['field_name', 'field_type', 'field_order', 'required'],
			}],
			where: {
				company_id: req.user.company_id,
				id: { [Op.ne]: req.params.eventId }
			},
			order: [
                ['name', 'ASC'],
                [{ model: Field, as: 'fields' }, 'field_order', 'ASC']
            ]
		});

		res.json(templates);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

app.post('/api/admin/events/:eventId/copy-fields', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	const { sourceEventId } = req.body;
	if (!sourceEventId) return res.status(400).json({ message: 'sourceEventId required' });

	try {
		const event = await Event.findOne({
			where: { id: req.params.eventId, company_id: req.user.company_id }
		});
		const sourceEvent = await Event.findOne({
			where: { id: sourceEventId, company_id: req.user.company_id }
		});
		if (!event || !sourceEvent) return res.status(404).json({ message: 'Event not found' });

		await sequelize.transaction(async (t) => {
			await Field.destroy({ where: { event_id: req.params.eventId }, transaction: t });

			const sourceFields = await Field.findAll({
				where: { event_id: sourceEventId },
				order: [['field_order', 'ASC']],
				transaction: t
			});

			for (let index = 0; index < sourceFields.length; index++) {
				const f = sourceFields[index];
				await Field.create({
					event_id: req.params.eventId,
					field_name: f.field_name,
					field_type: f.field_type,
					field_values: f.field_values,
					field_order: index,
					required: f.required
				}, { transaction: t });
			}
		});

		res.json({ success: true });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Database error' });
	}
});

// Admin Routes - Guest Custom Data
app.get('/api/admin/events/:eventId/guests/:guestId/customdata', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	try {
		const event = await Event.findOne({
			where: { id: req.params.eventId, company_id: req.user.company_id }
		});
		if (!event) return res.status(404).json({ message: 'Event not found' });

		const customData = await GuestData.findAll({
			include: [{
				model: Field,
				as: 'field',
				where: { event_id: req.params.eventId },
				attributes: ['field_name', 'field_type', 'field_order']
			}],
			where: { guest_id: req.params.guestId }
		});

		// Sort by field_order and format
		const sorted = customData.map(gd => ({
			custom_data_id: gd.id,
			field_id: gd.field_id,
			field_name: gd.field ? gd.field.field_name : '',
			field_type: gd.field ? gd.field.field_type : '',
			field_value: gd.field_value
		})).sort((a, b) => {
			const orderA = customData.find(x => x.id === a.custom_data_id)?.field?.field_order || 0;
			const orderB = customData.find(x => x.id === b.custom_data_id)?.field?.field_order || 0;
			return orderA - orderB;
		});

		res.json(sorted);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

app.post('/api/admin/events/:eventId/guests/:guestId/customdata', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	const { customData } = req.body; // Array of { field_id, field_value }
	if (!Array.isArray(customData)) return res.status(400).json({ message: 'customData must be an array' });

	try {
		const event = await Event.findOne({
			where: { id: req.params.eventId, company_id: req.user.company_id }
		});
		if (!event) return res.status(404).json({ message: 'Event not found' });

		await sequelize.transaction(async (t) => {
			for (const { field_id, field_value } of customData) {
				await GuestData.upsert({
					guest_id: req.params.guestId,
					field_id: field_id,
					field_value: field_value || null,
					updated_at: new Date()
				}, { transaction: t });
			}
		});

		res.json({ success: true });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Database error' });
	}
});

app.put('/api/admin/events/:eventId/guests/:guestId/customdata/:fieldId', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	const { field_value } = req.body;

	try {
		const event = await Event.findOne({
			where: { id: req.params.eventId, company_id: req.user.company_id }
		});
		if (!event) return res.status(404).json({ message: 'Event not found' });

		const gd = await GuestData.findOne({
			where: { guest_id: req.params.guestId, field_id: req.params.fieldId }
		});
		if (!gd) return res.status(404).json({ message: 'Custom data not found' });

		await gd.update({ field_value: field_value || null, updated_at: new Date() });
		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ message: 'Database error' });
	}
});

// Admin Routes - Sponsors
app.get('/api/admin/sponsors', authenticateToken, isManagerOrAdmin, async (req, res) => {
	try {
		const sponsors = await Sponsor.findAll({
			where: { company_id: req.user.company_id },
			attributes: {
				include: [
					[
						sequelize.literal(`(
							SELECT COUNT(*)
							FROM events_sponsors
							WHERE events_sponsors.sponsor_id = "Sponsor".id
						)`),
						'event_count'
					]
				]
			}
		});

		const result = sponsors.map(s => {
			const sponsorData = s.toJSON();
			sponsorData.event_count = parseInt(sponsorData.event_count || 0, 10);
			return sponsorData;
		});

		res.json(result);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

app.get('/api/admin/sponsors/:id/events', authenticateToken, isManagerOrAdmin, async (req, res) => {
	try {
		const sponsor = await Sponsor.findOne({
			where: { id: req.params.id, company_id: req.user.company_id }
		});
		if (!sponsor) return res.status(404).json({ message: 'Sponsor not found' });

		const events = await Event.findAll({
			include: [{
				model: Sponsor,
				as: 'sponsors',
				where: { id: req.params.id },
				attributes: [],
				required: true
			}],
			where: { company_id: req.user.company_id },
			attributes: ['name', 'date']
		});
		res.json(events);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

app.post('/api/admin/sponsors', authenticateToken, isManagerOrAdmin, async (req, res) => {
	const { name, description, logo, url, contact, contact_email, contact_phone, country } = req.body;
	try {
		const sponsor = await Sponsor.create({
			name: name || null,
			description: description || null,
			logo: logo || null,
			url: url || null,
			contact: contact || null,
			contact_email: contact_email || null,
			contact_phone: contact_phone || null,
			country: country || null,
			company_id: req.user.company_id
		});
		res.json({ id: sponsor.id });
	} catch (err) {
		console.error('Error creating sponsor:', err);
		res.status(500).json({ message: 'Error creating sponsor: ' + err.message });
	}
});

app.put('/api/admin/sponsors/:id', authenticateToken, isManagerOrAdmin, async (req, res) => {
	const { name, description, logo, url, contact, contact_email, contact_phone, country } = req.body;
	try {
		const sponsor = await Sponsor.findOne({
			where: { id: req.params.id, company_id: req.user.company_id }
		});
		if (!sponsor) return res.status(404).json({ message: 'Sponsor not found' });

		await sponsor.update({ name, description, logo, url, contact, contact_email, contact_phone, country });
		res.json({ success: true });
	} catch (err) {
		res.status(400).json({ message: 'Update failed: ' + err.message });
	}
});

app.delete('/api/admin/sponsors/:id', authenticateToken, isManagerOrAdmin, async (req, res) => {
	try {
		const sponsor = await Sponsor.findOne({
			where: { id: req.params.id, company_id: req.user.company_id }
		});
		if (!sponsor) return res.status(404).json({ message: 'Sponsor not found' });

		await sponsor.destroy();
		res.json({ success: true });
	} catch (err) {
		res.status(400).json({ message: 'Delete failed' });
	}
});

// Event Guests Management (registrant guests via guests + events_guests)
app.get('/api/admin/events/:id/guests', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	try {
		const event = await Event.findOne({
			where: { id: req.params.id, company_id: req.user.company_id }
		});
		if (!event) return res.status(404).json({ message: 'Event not found' });

		const eventGuests = await EventGuest.findAll({
			where: { event_id: req.params.id }
		});
		const guestIds = eventGuests.map(eg => eg.guest_id);

		const baseGuests = await Guest.findAll({
			where: { id: { [Op.in]: guestIds } }
		});

		const guests = await Promise.all(baseGuests.map(async (g) => {
			const eg = eventGuests.find(eg => eg.guest_id === g.id);
			const rows = await GuestData.findAll({
				where: { guest_id: g.id },
				include: [{ model: Field, as: 'field', where: { event_id: req.params.id }, attributes: ['field_name'] }]
			});

			const obj = {
				id: g.id,
				email: g.email,
				creation_date: g.creation_date,
				invited: Boolean(eg?.invited_date),
				invited_date: eg ? eg.invited_date : null,
				accepted: Boolean(eg?.accepted_date),
				accepted_date: eg ? eg.accepted_date : null,
				attended: Boolean(eg?.attended_date),
				attended_date: eg ? eg.attended_date : null,
				invitation_code: eg ? eg.invitation_code : null
			};

			rows.forEach(r => {
				if (r.field) {
					obj[r.field.field_name] = r.field_value;
				}
			});
			return obj;
		}));

		res.json(guests);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

app.delete('/api/admin/events/:id/guests/:guestId', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	try {
		const event = await Event.findOne({
			where: { id: req.params.id, company_id: req.user.company_id }
		});
		if (!event) return res.status(404).json({ message: 'Event not found' });

		await EventGuest.destroy({
			where: { event_id: req.params.id, guest_id: req.params.guestId }
		});
		res.json({ success: true });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

// Event Sponsors Management
app.get('/api/admin/events/:id/sponsors', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	try {
		const event = await Event.findOne({
			where: { id: req.params.id, company_id: req.user.company_id }
		});
		if (!event) return res.status(404).json({ message: 'Event not found' });

		const sponsors = await Sponsor.findAll({
			include: [{
				model: Event,
				as: 'events',
				where: { id: req.params.id },
				attributes: [],
				required: true
			}],
			where: { company_id: req.user.company_id }
		});
		res.json(sponsors);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

app.get('/api/admin/events/:id/available-sponsors', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	try {
		const event = await Event.findOne({
			where: { id: req.params.id, company_id: req.user.company_id }
		});
		if (!event) return res.status(404).json({ message: 'Event not found' });

		const assignedSponsors = await EventSponsor.findAll({
			where: { event_id: req.params.id }
		});
		const assignedIds = assignedSponsors.map(es => es.sponsor_id);

		const sponsors = await Sponsor.findAll({
			where: {
				company_id: req.user.company_id,
				id: { [Op.notIn]: assignedIds.length > 0 ? assignedIds : [-1] }
			}
		});
		res.json(sponsors);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

app.post('/api/admin/events/:id/sponsors', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	const { sponsorIds } = req.body;
	const eventId = req.params.id;

	try {
		const event = await Event.findOne({
			where: { id: eventId, company_id: req.user.company_id }
		});
		if (!event) return res.status(404).json({ message: 'Event not found' });

		// Validate target sponsors belong to same company
		for (const sponsorId of sponsorIds) {
			const targetSponsor = await Sponsor.findOne({
				where: { id: sponsorId, company_id: req.user.company_id }
			});
			if (!targetSponsor) {
				return res.status(403).json({ message: 'Unauthorized sponsor addition' });
			}
		}

		await sequelize.transaction(async (t) => {
			for (const sponsorId of sponsorIds) {
				await EventSponsor.findOrCreate({
					where: { sponsor_id: sponsorId, event_id: eventId },
					transaction: t
				});
			}
		});

		res.json({ success: true });
	} catch (err) {
		console.error('Error adding sponsors to event:', err);
		res.status(400).json({ message: 'Error adding sponsors: ' + err.message });
	}
});

app.delete('/api/admin/events/:id/sponsors/:sponsorId', authenticateToken, isManagerOrAdmin, isEventAssigned, async (req, res) => {
	try {
		const event = await Event.findOne({
			where: { id: req.params.id, company_id: req.user.company_id }
		});
		if (!event) return res.status(404).json({ message: 'Event not found' });

		await EventSponsor.destroy({
			where: { event_id: req.params.id, sponsor_id: req.params.sponsorId }
		});
		res.json({ success: true });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

app.post('/api/admin/events/:id/guests/import', authenticateToken, isManagerOrAdmin, isEventAssigned, upload.single('file'), async (req, res) => {
	if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

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
	const header = lines[0].split(',').map(h => h.trim().toLowerCase()).filter(Boolean);

	const errors = [];
	let importedCount = 0;
	const eventId = req.params.id;

	try {
		const event = await Event.findOne({
			where: { id: eventId, company_id: req.user.company_id }
		});
		if (!event) {
			return res.status(404).json({ message: 'Event not found' });
		}
		if (event.status !== 'active') {
			return res.status(400).json({ message: 'It is only possible to add guests when the event is Active' });
		}

		const eventFields = await Field.findAll({ where: { event_id: eventId } });
		const dbFieldNames = eventFields.map(f => f.field_name.toLowerCase());
		const matchedFields = [];
		const unmatchedFields = [];

		header.forEach(h => {
			if (dbFieldNames.includes(h)) {
				matchedFields.push(h);
			} else {
				unmatchedFields.push(h);
			}
		});

		await sequelize.transaction(async (t) => {
			for (let i = 1; i < lines.length; i++) {
				if (!lines[i].trim()) continue;

				const values = lines[i].split(',').map(v => v.trim());
				const row = {};
				header.forEach((h, index) => {
					row[h] = values[index] !== undefined ? values[index] : '';
				});

				if (!row.email) {
					errors.push(`Line ${i + 1}: Missing email`);
					continue;
				}

				let [guest] = await Guest.findOrCreate({
					where: { email: row.email },
					transaction: t
				});

				const invitationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
				await EventGuest.findOrCreate({
					where: { guest_id: guest.id, event_id: eventId },
					defaults: { invitation_code: invitationCode },
					transaction: t
				});

				// Insert field data (name, surname, email and any extras)
				for (const field of eventFields) {
					const val = row[field.field_name.toLowerCase()];
					if (val !== undefined) {
						await GuestData.upsert({
							guest_id: guest.id,
							field_id: field.id,
							field_value: val
						}, { transaction: t });
					}
				}
				importedCount++;
			}
		});

		fs.unlinkSync(req.file.path);
		res.json({
			success: true,
			importedCount,
			matchedFields,
			unmatchedFields,
			errors
		});
	} catch (err) {
		console.error(err);
		if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
		res.status(500).json({ message: 'Import failed' });
	}
});

// Public Routes - Guest Confirmation
app.get('/api/public/confirmation/:code', async (req, res) => {
	try {
		const eg = await EventGuest.findOne({
			where: { invitation_code: req.params.code }
		});
		if (!eg) return res.status(404).json({ message: 'Invalid invitation code' });
		if (eg.accepted_date) return res.status(400).json({ message: 'This invitation has already been used and confirmed.' });

		const guest = await Guest.findByPk(eg.guest_id);
		const event = await Event.findByPk(eg.event_id);

		// Enrich with field data
		const fieldRows = await GuestData.findAll({
			where: { guest_id: eg.guest_id },
			include: [{ model: Field, as: 'field', where: { event_id: eg.event_id } }]
		});

		const data = {
			guest_id: guest.id,
			email: guest.email,
			event_id: event.id,
			event_name: event.name,
			city: event.city,
			country: event.country,
			date: event.date,
			accepted: eg.accepted_date ? 1 : 0,
			invitation_code: eg.invitation_code
		};

		res.json(data);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

app.post('/api/public/confirm', async (req, res) => {
	const { code, userData } = req.body;
	try {
		const eg = await EventGuest.findOne({
			where: { invitation_code: code }
		});
		if (!eg) return res.status(404).json({ message: 'Invalid code' });
		if (eg.accepted_date) return res.status(400).json({ message: 'Invitation already confirmed' });

		const guest = await Guest.findByPk(eg.guest_id);
		const event = await Event.findByPk(eg.event_id);

		// Upsert field data (name, surname, etc.) into guestdata
		const fields = await Field.findAll({ where: { event_id: eg.event_id } });
		await sequelize.transaction(async (t) => {
			for (const f of fields) {
				if (userData[f.field_name] !== undefined) {
					await GuestData.upsert({
						guest_id: eg.guest_id,
						field_id: f.id,
						field_value: userData[f.field_name]
					}, { transaction: t });
				}
			}
			await eg.update({ accepted_date: new Date() }, { transaction: t });
		});

		// Send Badge Email
		try {
			const guestForBadge = { ...userData, invitation_code: code };
			const badgeHtml = buildBadgeEmailHtml(guestForBadge, event);
			await axios.post(SENDPIGEON_API, {
				from: EMAIL_FROM,
				to: guest.email,
				subject: `Confirmation & Digital Badge: ${event.name}`,
				html: badgeHtml,
			}, { headers: sendpigeonHeaders() });
		} catch (err) {
			console.error('Failed to send badge email:', err.message);
		}

		res.json({ success: true });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

// Mobile App Routes - For Staff (Admins, Managers and Users)
app.get('/api/mobile/events', authenticateToken, isStaff, async (req, res) => {
	try {
		if (req.user.type === 'admin') {
			const events = await Event.findAll({
				where: { status: 'active', company_id: req.user.company_id }
			});
			return res.json(events);
		} else {
			const events = await Event.findAll({
				include: [{
					model: User,
					as: 'assignedUsers',
					where: { id: req.user.id },
					attributes: [],
					required: true
				}],
				where: { status: 'active' }
			});
			return res.json(events);
		}
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

app.post('/api/mobile/validate', authenticateToken, isStaff, async (req, res) => {
	const { invitationCode, eventId } = req.body;

	try {
		// Verify the event belongs to the same company
		const eventCheck = await Event.findByPk(eventId);
		if (!eventCheck || eventCheck.company_id !== req.user.company_id) {
			return res.status(403).json({ message: 'You are not authorized to scan for this event' });
		}

		// Verify if the scanning staff member is assigned to this event (admins bypass)
		if (req.user.type !== 'admin') {
			const isAssigned = await EventUser.findOne({
				where: { user_id: req.user.id, event_id: eventId }
			});
			if (!isAssigned) {
				return res.status(403).json({ message: 'You are not assigned to this event' });
			}
		}

		// Look up the guest by invitation code in events_guests
		const eg = await EventGuest.findOne({
			where: { invitation_code: invitationCode, event_id: eventId }
		});
		if (!eg) return res.status(404).json({ message: 'Invalid badge' });

		const guest = await Guest.findByPk(eg.guest_id);
		const event = await Event.findByPk(eg.event_id);

		// Get name & surname from custom fields
		const nameField = await Field.findOne({ where: { event_id: eventId, field_name: 'name' } });
		const surnameField = await Field.findOne({ where: { event_id: eventId, field_name: 'surname' } });

		let guestName = '';
		let guestSurname = '';

		if (nameField) {
			const gdName = await GuestData.findOne({ where: { guest_id: eg.guest_id, field_id: nameField.id } });
			if (gdName) guestName = gdName.field_value || '';
		}
		if (surnameField) {
			const gdSurname = await GuestData.findOne({ where: { guest_id: eg.guest_id, field_id: surnameField.id } });
			if (gdSurname) guestSurname = gdSurname.field_value || '';
		}

		await eg.update({ attended_date: new Date() });

		res.json({
			success: true,
			message: 'Attendance validated',
			guestName: `${guestName} ${guestSurname}`.trim(),
			eventName: event.name
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	}
});

// Start DB then listen
initDb()
	.then(() => {
		const server = app.listen(PORT, () => {
			console.log(`Server running on http://localhost:${PORT}`);
		});

		server.on('error', (err) => {
			console.error('Failed to start server:', err);
			process.exit(1);
		});
	})
	.catch(err => {
		console.error('Failed to initialize database:', err);
		process.exit(1);
	});
