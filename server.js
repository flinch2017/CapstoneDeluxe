const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL pool connection (local)
const pool = new Pool({
  user: process.env.DB_USER,         // e.g., 'postgres'
  host: process.env.DB_HOST,         // e.g., 'localhost'
  database: process.env.DB_NAME,     // e.g., 'your_db_name'
  password: process.env.DB_PASSWORD, // your PostgreSQL password
  port: process.env.DB_PORT,         // usually 5432
});


// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Set EJS as the view engine and views folder
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // This line is optional unless you move views folder


// Session middleware (simple config for now)
app.use(session({
  secret: 'pasrap_secret_key',
  resave: false,
  saveUninitialized: false,
}));


// Routes
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.render('homepage', { serverTime: result.rows[0].now });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send('Database connection error');
  }
});

// Show Login Page
app.get('/login', (req, res) => {
  res.render('login');
});

// Show Signup Page
app.get('/signup', (req, res) => {
  res.render('signup');
});

// Signup Handler
app.post('/signup', async (req, res) => {
  const { idnumber, username, email, password } = req.body;

  try {
    // Check if ID already exists
    const checkUser = await pool.query('SELECT * FROM users WHERE idnumber = $1 OR email = $2', [idnumber, email]);
    if (checkUser.rows.length > 0) {
      return res.send('ID number or email already registered.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (idnumber, username, email, password) VALUES ($1, $2, $3, $4)',
      [idnumber, username, email, hashedPassword]
    );

    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.send('Error during signup');
  }
});

// Login Handler
app.post('/login', async (req, res) => {
  const { idnumber, password } = req.body;

  try {
    let user = null;
    let role = null;

    // Check if user is admin
    const adminResult = await pool.query('SELECT * FROM admins WHERE idnumber = $1', [idnumber]);
    if (adminResult.rows.length > 0) {
      user = adminResult.rows[0];
      role = 'admin';
    } else {
      // Check if user is student
      const studentResult = await pool.query('SELECT * FROM students WHERE idnumber = $1', [idnumber]);
      if (studentResult.rows.length > 0) {
        user = studentResult.rows[0];
        role = 'student';
      }
    }

    if (!user) {
      return res.send('No user found with that ID number.');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.send('Incorrect password.');
    }

    // Save session
    req.session.user = {
      idnumber: user.idnumber,
      username: user.username || user.fullname || 'User',
      role: role
    };

    // Redirect based on role
    if (role === 'admin') {
      return res.redirect('/admin-dashboard');
    } else {
      return res.redirect('/student-dashboard');
    }

  } catch (err) {
    console.error(err);
    res.send('Error during login');
  }
});


// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});


// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
