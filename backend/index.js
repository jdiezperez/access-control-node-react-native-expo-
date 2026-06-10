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
	if (req.user.type !== 'admin') return res.status(403).json({ message: 'Admin access required' });
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
		return res.status(403).json({ message: 'Mobile access denied' });
	}
	next();
};

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

// Auth Routes
app.post('/api/auth/login', (req, res) => {
	const { email, password } = req.body;
	const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

	if (!user || !bcrypt.compareSync(password, user.password)) {
		return res.status(401).json({ message: 'Invalid credentials' });
	}

	if (user.type !== 'admin' && user.type !== 'user' && user.type !== 'manager') {
		return res.status(403).json({ message: 'Access denied. Unauthorized account type.' });
	}

	const token = jwt.sign({ id: user.id, email: user.email, type: user.type, company_id: user.company_id }, JWT_SECRET, { expiresIn: '24h' });
	res.json({ token, user: { id: user.id, name: user.name, type: user.type, company_id: user.company_id } });
});

// Upload Route
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
	if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
	const folder = req.query.folder || 'general';
	const url = `/uploads/${folder}/${req.file.filename}`;
	res.json({ url });
});

// Admin Routes - Company
// GET: managers & admins can read company info (needed for logo, org name)
app.get('/api/admin/company', authenticateToken, isManagerOrAdmin, (req, res) => {
	const company = db.prepare('SELECT * FROM company WHERE id = ?').get(req.user.company_id);
	res.json(company || {});
});

app.post('/api/admin/company', authenticateToken, isAdmin, (req, res) => {
	const { name, logo, address, email, phone, city, country } = req.body;
	const existing = db.prepare('SELECT id FROM company WHERE id = ?').get(req.user.company_id);
	if (existing) {
		db.prepare('UPDATE company SET name = ?, logo = ?, address = ?, email = ?, phone = ?, city = ?, country = ? WHERE id = ?')
			.run(name, logo, address, email, phone, city, country, req.user.company_id);
	} else {
		db.prepare('INSERT INTO company (id, name, logo, address, email, phone, city, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
			.run(req.user.company_id, name, logo, address, email, phone, city, country);
	}
	res.json({ success: true });
});

// Admin Routes - Users (Admins & Guests)
app.get('/api/admin/users', authenticateToken, isManagerOrAdmin, (req, res) => {
	const type = req.query.type;
	let users;
	if (type) {
		users = db.prepare('SELECT * FROM users WHERE type = ? AND company_id = ?').all(type, req.user.company_id);
	} else {
		users = db.prepare('SELECT * FROM users WHERE company_id = ?').all(req.user.company_id);
	}
	res.json(users);
});

app.post('/api/admin/users', authenticateToken, isManagerOrAdmin, (req, res) => {
	const { name, surname, email, type, password, city, country, organization, role, gender } = req.body;

	// Validation: manager cannot create/promote admin
	if (req.user.type === 'manager' && type === 'admin') {
		return res.status(403).json({ message: 'Managers cannot create admin users' });
	}

	// Validation: one admin per company
	if (type === 'admin') {
		const existingAdmin = db.prepare('SELECT id FROM users WHERE type = ? AND company_id = ?').get('admin', req.user.company_id);
		if (existingAdmin) {
			return res.status(400).json({ message: 'There can only be one admin user per company.' });
		}
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

app.put('/api/admin/users/:id', authenticateToken, isManagerOrAdmin, (req, res) => {
	const { name, surname, email, type, city, country, organization, role, gender, image } = req.body;

	// Validation: manager cannot promote/demote admin & user must be in same company
	const userToEdit = db.prepare('SELECT type, company_id FROM users WHERE id = ?').get(req.params.id);
	if (!userToEdit || userToEdit.company_id !== req.user.company_id) {
		return res.status(404).json({ message: 'User not found' });
	}

	if (req.user.type === 'manager' && (type === 'admin' || userToEdit.type === 'admin')) {
		return res.status(403).json({ message: 'Managers cannot modify or assign admin privileges' });
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

	if (req.user.type === 'manager' && userToDelete.type === 'admin') {
		return res.status(403).json({ message: 'Managers cannot delete admins' });
	}

	try {
		db.prepare('DELETE FROM users WHERE id = ? AND company_id = ?').run(req.params.id, req.user.company_id);
		res.json({ success: true });
	} catch (err) {
		res.status(400).json({ message: 'Delete failed' });
	}
});

// User-Event Assignment Routes (for admin/user type users)
app.get('/api/admin/users/:id/events', authenticateToken, isManagerOrAdmin, (req, res) => {
	const targetUser = db.prepare('SELECT company_id FROM users WHERE id = ?').get(req.params.id);
	if (!targetUser || targetUser.company_id !== req.user.company_id) {
		return res.status(404).json({ message: 'User not found' });
	}
	const events = db.prepare(`
		SELECT e.*, 
			CASE WHEN eg.user_id IS NOT NULL THEN 1 ELSE 0 END as assigned
		FROM events e
		LEFT JOIN events_guests eg ON e.id = eg.event_id AND eg.user_id = ?
		WHERE e.status IN ('not active', 'active') AND e.company_id = ?
		ORDER BY e.date DESC
	`).all(req.params.id, req.user.company_id);
	res.json(events);
});

app.post('/api/admin/users/:id/events/:eventId', authenticateToken, isManagerOrAdmin, (req, res) => {
	const { id, eventId } = req.params;
	const targetUser = db.prepare('SELECT company_id FROM users WHERE id = ?').get(id);
	const targetEvent = db.prepare('SELECT company_id FROM events WHERE id = ?').get(eventId);
	if (!targetUser || targetUser.company_id !== req.user.company_id || !targetEvent || targetEvent.company_id !== req.user.company_id) {
		return res.status(403).json({ message: 'Unauthorized access' });
	}
	try {
		const invitationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
		db.prepare(`
			INSERT OR IGNORE INTO events_guests (user_id, event_id, invitation_code)
			VALUES (?, ?, ?)
		`).run(id, eventId, invitationCode);
		res.json({ success: true });
	} catch (err) {
		res.status(400).json({ message: 'Error assigning event: ' + err.message });
	}
});

app.delete('/api/admin/users/:id/events/:eventId', authenticateToken, isManagerOrAdmin, (req, res) => {
	const { id, eventId } = req.params;
	const targetUser = db.prepare('SELECT company_id FROM users WHERE id = ?').get(id);
	const targetEvent = db.prepare('SELECT company_id FROM events WHERE id = ?').get(eventId);
	if (!targetUser || targetUser.company_id !== req.user.company_id || !targetEvent || targetEvent.company_id !== req.user.company_id) {
		return res.status(403).json({ message: 'Unauthorized access' });
	}
	try {
		db.prepare('DELETE FROM events_guests WHERE user_id = ? AND event_id = ?').run(id, eventId);
		res.json({ success: true });
	} catch (err) {
		res.status(400).json({ message: 'Error unassigning event: ' + err.message });
	}
});

app.post('/api/admin/guests/:id/send', authenticateToken, isManagerOrAdmin, (req, res) => {
	const guest = db.prepare('SELECT company_id FROM users WHERE id = ? AND type = ?').get(req.params.id, 'guest');
	if (!guest || guest.company_id !== req.user.company_id) return res.status(404).json({ message: 'Guest not found' });
	res.json({ success: true, message: 'Invitation email sent' });
});

app.get('/api/admin/guests', authenticateToken, isManagerOrAdmin, (req, res) => {
	const guests = db.prepare(`
		SELECT u.*, COUNT(eg.event_id) as event_count
		FROM users u
		LEFT JOIN events_guests eg ON u.id = eg.user_id
		WHERE u.type = 'guest' AND u.company_id = ?
		GROUP BY u.id
	`).all(req.user.company_id);
	res.json(guests);
});

app.get('/api/admin/guests/:id/events', authenticateToken, isManagerOrAdmin, (req, res) => {
	const guest = db.prepare('SELECT company_id FROM users WHERE id = ? AND type = ?').get(req.params.id, 'guest');
	if (!guest || guest.company_id !== req.user.company_id) return res.status(404).json({ message: 'Guest not found' });

	const events = db.prepare(`
		SELECT e.name, e.date, eg.invited, eg.accepted, eg.attended
		FROM events e
		JOIN events_guests eg ON e.id = eg.event_id
		WHERE eg.user_id = ? AND e.company_id = ?
	`).all(req.params.id, req.user.company_id);
	res.json(events);
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

// Invite a single guest
app.post('/api/admin/events/:id/guests/:userId/invite', authenticateToken, isManagerOrAdmin, async (req, res) => {
	const event = db.prepare('SELECT * FROM events WHERE id = ? AND company_id = ?').get(req.params.id, req.user.company_id);
	if (!event) return res.status(404).json({ message: 'Event not found' });
	if (!event.email_template) return res.status(400).json({ message: 'No email template set for this event' });

	const guest = db.prepare('SELECT * FROM users WHERE id = ? AND company_id = ?').get(req.params.userId, req.user.company_id);
	if (!guest) return res.status(404).json({ message: 'Guest not found' });

	try {
		const guestWithCode = db.prepare('SELECT invitation_code FROM events_guests WHERE event_id = ? AND user_id = ?').get(req.params.id, req.params.userId);
		const html = buildEmailHtml(event.email_template, guest, event, guestWithCode?.invitation_code);
		const response = await axios.post(SENDPIGEON_API, {
			from: EMAIL_FROM,
			to: guest.email,
			subject: `You are invited to ${event.name}`,
			html,
		}, { headers: sendpigeonHeaders() });

		if (response.data?.status === 'failed') {
			return res.status(500).json({ message: 'Email delivery failed' });
		}

		db.prepare('UPDATE events_guests SET invited = 1, invited_date = CURRENT_TIMESTAMP WHERE event_id = ? AND user_id = ?')
			.run(req.params.id, req.params.userId);
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

	const guests = db.prepare(`
		SELECT u.* FROM users u
		JOIN events_guests eg ON u.id = eg.user_id
		WHERE eg.event_id = ? AND u.company_id = ?
	`).all(req.params.id, req.user.company_id);

	if (guests.length === 0) return res.json({ success: true, sent: 0, errors: [] });

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
		const updateStmt = db.prepare('UPDATE events_guests SET invited = 1, invited_date = CURRENT_TIMESTAMP WHERE event_id = ? AND user_id = ?');
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
	const info = db.prepare(`
		INSERT INTO events (name, city, country, date, email_template, status, logo, company_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`).run(name, city, country, date, email_template, status || 'not active', logo, req.user.company_id);
	res.json({ id: info.lastInsertRowid });
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

// Event Guests Management
app.get('/api/admin/events/:id/guests', authenticateToken, isManagerOrAdmin, (req, res) => {
	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(req.params.id);
	if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });

	const guests = db.prepare(`
		SELECT u.*, eg.invited, eg.invited_date, eg.accepted, eg.accepted_date, eg.attended, eg.attended_date, eg.invitation_code
		FROM users u
		JOIN events_guests eg ON u.id = eg.user_id
		WHERE eg.event_id = ? AND u.company_id = ?
	`).all(req.params.id, req.user.company_id);
	res.json(guests);
});

app.get('/api/admin/events/:id/available-guests', authenticateToken, isManagerOrAdmin, (req, res) => {
	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(req.params.id);
	if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });

	const guests = db.prepare(`
		SELECT * FROM users 
		WHERE type = 'guest' AND company_id = ?
		AND id NOT IN (SELECT user_id FROM events_guests WHERE event_id = ?)
	`).all(req.user.company_id, req.params.id);
	res.json(guests);
});

app.post('/api/admin/events/:id/guests', authenticateToken, isManagerOrAdmin, (req, res) => {
	const { userIds } = req.body;
	const eventId = req.params.id;

	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(eventId);
	if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });

	// Validate target users belong to same company
	const stmtCheck = db.prepare('SELECT company_id FROM users WHERE id = ?');
	for (const userId of userIds) {
		const targetUser = stmtCheck.get(userId);
		if (!targetUser || targetUser.company_id !== req.user.company_id) {
			return res.status(403).json({ message: 'Unauthorized guest addition' });
		}
	}

	const insert = db.prepare(`
		INSERT INTO events_guests (user_id, event_id, invitation_code)
		VALUES (?, ?, ?)
	`);

	const transaction = db.transaction((ids) => {
		for (const userId of ids) {
			const invitationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
			insert.run(userId, eventId, invitationCode);
		}
	});

	try {
		transaction(userIds);
		res.json({ success: true });
	} catch (err) {
		res.status(400).json({ message: 'Error adding guests' });
	}
});

app.delete('/api/admin/events/:id/guests/:userId', authenticateToken, isManagerOrAdmin, (req, res) => {
	const event = db.prepare('SELECT company_id FROM events WHERE id = ?').get(req.params.id);
	if (!event || event.company_id !== req.user.company_id) return res.status(404).json({ message: 'Event not found' });

	db.prepare('DELETE FROM events_guests WHERE event_id = ? AND user_id = ?')
		.run(req.params.id, req.params.userId);
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

	const findUser = db.prepare('SELECT id FROM users WHERE email = ?');
	const createUser = db.prepare(`
		INSERT INTO users (name, surname, email, role, organization, city, country, gender, type, company_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`);
	const assignToEvent = db.prepare(`
		INSERT OR IGNORE INTO events_guests (user_id, event_id, invitation_code)
		VALUES (?, ?, ?)
	`);

	const transaction = db.transaction(() => {
		for (let i = 1; i < lines.length; i++) {
			if (!lines[i].trim()) continue;

			const values = lines[i].split(',').map(v => v.trim());
			const guest = {};
			header.forEach((h, index) => guest[h] = values[index]);

			if (!guest.name || !guest.surname || !guest.email) {
				errors.push(`Line ${i + 1}: Missing name, surname or email`);
				continue;
			}

			let userId;
			const existing = findUser.get(guest.email);
			if (existing) {
				userId = existing.id;
			} else {
				const info = createUser.run(
					guest.name, guest.surname, guest.email,
					guest.role || null, guest.organization || null,
					guest.city || null, guest.country || null,
					(guest.gender && guest.gender.toLowerCase()) || null,
					guest.type || 'guest',
					req.user.company_id
				);
				userId = info.lastInsertRowid;
			}
			const invitationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
			assignToEvent.run(userId, eventId, invitationCode);
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
	const data = db.prepare(`
		SELECT u.*, e.name as event_name, e.city, e.country, e.date, eg.accepted, eg.invitation_code
		FROM users u
		JOIN events_guests eg ON u.id = eg.user_id
		JOIN events e ON eg.event_id = e.id
		WHERE eg.invitation_code = ?
	`).get(req.params.code);

	if (!data) return res.status(404).json({ message: 'Invalid invitation code' });
	if (data.accepted) return res.status(400).json({ message: 'This invitation has already been used and confirmed.' });
	res.json(data);
});

app.post('/api/public/confirm', async (req, res) => {
	const { code, userData } = req.body;
	const invitation = db.prepare(`
		SELECT eg.user_id, eg.event_id, eg.accepted, u.email, u.name, u.surname, eg.invitation_code
		FROM events_guests eg
		JOIN users u ON eg.user_id = u.id
		WHERE eg.invitation_code = ?
	`).get(code);

	if (!invitation) return res.status(404).json({ message: 'Invalid code' });
	if (invitation.accepted) return res.status(400).json({ message: 'Invitation already confirmed' });

	const event = db.prepare('SELECT * FROM events WHERE id = ?').get(invitation.event_id);

	// Update user data
	db.prepare(`
		UPDATE users SET 
		name = ?, surname = ?, city = ?, country = ?, organization = ?, role = ?, gender = ?, image = ?
		WHERE id = ?
	`).run(
		userData.name, userData.surname, userData.city, userData.country,
		userData.organization, userData.role, userData.gender, userData.image,
		invitation.user_id
	);

	// Mark as accepted
	db.prepare(`
		UPDATE events_guests 
		SET accepted = 1, accepted_date = CURRENT_TIMESTAMP 
		WHERE invitation_code = ?
	`).run(code);

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

// Mobile App Routes - For Staff (Admins and Users)
app.get('/api/mobile/events', authenticateToken, isStaff, (req, res) => {
	const events = db.prepare(`
		SELECT e.* FROM events e
		JOIN events_guests eg ON e.id = eg.event_id
		WHERE e.status = 'active' AND eg.user_id = ?
	`).all(req.user.id);
	res.json(events);
});

app.post('/api/mobile/validate', authenticateToken, isStaff, (req, res) => {
	const { invitationCode, eventId } = req.body;
	
	// Verify if the scanning user is actually assigned to this event
	const isAssigned = db.prepare(`
		SELECT 1 FROM events_guests 
		WHERE user_id = ? AND event_id = ?
	`).get(req.user.id, eventId);

	// Verify the event belongs to the same company
	const eventCheck = db.prepare('SELECT company_id FROM events WHERE id = ?').get(eventId);
	if (!eventCheck || eventCheck.company_id !== req.user.company_id) {
		return res.status(403).json({ message: 'You are not authorized to scan for this event' });
	}

	if (!isAssigned && req.user.type !== 'admin' && req.user.type !== 'manager') {
		return res.status(403).json({ message: 'You are not assigned to this event' });
	}

	const guestInfo = db.prepare(`
		SELECT u.name, u.surname, e.name as event_name
		FROM events_guests eg
		JOIN users u ON eg.user_id = u.id
		JOIN events e ON eg.event_id = e.id
		WHERE eg.invitation_code = ? AND eg.event_id = ?
	`).get(invitationCode, eventId);

	if (!guestInfo) return res.status(404).json({ message: 'Invalid badge' });

	db.prepare(`
		UPDATE events_guests 
		SET attended = 1, attended_date = CURRENT_TIMESTAMP 
		WHERE invitation_code = ? AND event_id = ?
	`).run(invitationCode, eventId);

	res.json({ 
		success: true, 
		message: 'Attendance validated',
		guestName: `${guestInfo.name} ${guestInfo.surname}`,
		eventName: guestInfo.event_name
	});
});

// Start server
app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
