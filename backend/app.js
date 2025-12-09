const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Auth Middleware
const checkAppPassword = (req, res, next) => {
    const password = req.headers['x-app-password'];
    if (password !== process.env.APP_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized: Invalid App Password' });
    }
    next();
};

app.get('/', (req, res) => {
    res.send('Krushn Calendar API is running');
});

// Routes
const eventsRouter = require('./routes/events');
const categoriesRouter = require('./routes/categories');

app.use('/api/events', checkAppPassword, eventsRouter);
app.use('/api/categories', checkAppPassword, categoriesRouter);

module.exports = app;
