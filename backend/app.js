const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const passport = require('passport');
const cookieSession = require('cookie-session');
const path = require('path');
const connectDB = require('./config/db');

dotenv.config();
require('./config/passport'); // Init passport config

const app = express();

// Connect to DB immediately (Serverless optimization check needed, but fine for now)
connectDB();

// Trust Proxy (Required for Vercel/Heroku to see https)
app.set('trust proxy', 1);

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

// Session
app.use(cookieSession({
    maxAge: 30 * 24 * 60 * 60 * 1000,
    keys: [process.env.COOKIE_KEY || 'secretKey']
}));

// Passport
app.use((req, res, next) => {
    if (req.session && !req.session.regenerate) {
        req.session.regenerate = (cb) => {
            cb();
        };
    }
    if (req.session && !req.session.save) {
        req.session.save = (cb) => {
            cb();
        };
    }
    next();
});

app.use(passport.initialize());
app.use(passport.session());

// Auth Routes
app.get('/api/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.readonly'],
    accessType: 'offline', // Request refresh token
    prompt: 'consent'
}));

app.get('/api/auth/google/callback', passport.authenticate('google', {
    failureRedirect: '/'
}), (req, res) => {
    res.redirect('/');
});

app.get('/api/auth/me', (req, res) => {
    res.json(req.user || null);
});

app.get('/api/auth/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

// Protect API Middleware
const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

app.get('/api/health', (req, res) => {
    res.send('API Running');
});

// API Routes
const eventsRouter = require('./routes/events');
const categoriesRouter = require('./routes/categories');

app.use('/api/events', requireAuth, eventsRouter);
app.use('/api/categories', requireAuth, categoriesRouter);

// Serve Frontend Static Files (Production)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));

    app.get('*', (req, res) => {
        // Exclude API routes from SPA fallback (should have been caught above, but safety)
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ error: 'API route not found' });
        }
        res.sendFile(path.resolve(__dirname, '../frontend/dist', 'index.html'));
    });
}

module.exports = app;
