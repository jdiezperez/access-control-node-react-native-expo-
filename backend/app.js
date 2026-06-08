const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('./db');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

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
    const fs = require('fs');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
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

const isStaff = (req, res, next) => {
  if (req.user.type !== 'admin' && req.user.type !== 'user') {
    return res.status(403).json({ message: 'Mobile access denied' });
  }
  next();
};

// Example route (add your routes here)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = { app, PORT };
