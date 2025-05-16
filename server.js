const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;




// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Set EJS as the view engine and views folder
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // This line is optional unless you move views folder



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


// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
