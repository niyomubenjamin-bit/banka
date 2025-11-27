require('dotenv').config();
const express = require('express');
const path = require('path');
const { pool } = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const accountRoutes = require('./routes/accountRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets from public
app.use(express.static(path.join(__dirname, '..', '..', 'public')));

// Explicitly serve dashboard.html to avoid 404s
app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'dashboard.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'index.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'index.html'));
});

// CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api', require('./routes/contactRoutes'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Banka API is running' });
});

module.exports = app;
