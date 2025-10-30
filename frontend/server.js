const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ============================================
// AUTH MIDDLEWARE
// ============================================

function requireAuth(req, res, next) {
    if (!req.session.token) {
        return res.redirect('/login');
    }
    next();
}

function redirectIfAuth(req, res, next) {
    if (req.session.token) {
        return res.redirect('/');
    }
    next();
}

// ============================================
// PAGE ROUTES
// ============================================

app.get('/login', redirectIfAuth, (req, res) => {
    res.render('login', { 
        title: 'Login - Smolagent',
        error: null 
    });
});

app.get('/register', redirectIfAuth, (req, res) => {
    res.render('register', { 
        title: 'Register - Smolagent',
        error: null 
    });
});

app.get('/', requireAuth, (req, res) => {
    res.render('index', { 
        title: 'Smolagent Framework - Unified AI Assistant',
        backendUrl: BACKEND_URL,
        user: req.session.user
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// ============================================
// AUTH API ENDPOINTS
// ============================================

app.post('/api/auth/register', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/auth/register`, req.body);
        
        // Store token and user in session
        req.session.token = response.data.token;
        req.session.user = response.data.user;
        
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ 
            error: error.response?.data?.error || 'Registration failed' 
        });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/auth/login`, req.body);
        
        // Store token and user in session
        req.session.token = response.data.token;
        req.session.user = response.data.user;
        
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ 
            error: error.response?.data?.error || 'Login failed' 
        });
    }
});

// ============================================
// PROTECTED API ENDPOINTS
// ============================================

app.post('/api/message', requireAuth, async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/message`, req.body, {
            headers: {
                'Authorization': `Bearer ${req.session.token}`
            }
        });
        res.json(response.data);
    } catch (error) {
        if (error.response?.status === 401) {
            req.session.destroy();
            return res.status(401).json({ error: 'Session expired. Please login again.' });
        }
        res.status(error.response?.status || 500).json({ 
            error: error.response?.data?.error || 'Backend error' 
        });
    }
});

app.post('/api/clear', requireAuth, async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/clear`, req.body, {
            headers: {
                'Authorization': `Bearer ${req.session.token}`
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ 
            error: error.response?.data?.error || 'Backend error' 
        });
    }
});

app.post('/api/save', requireAuth, async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/save`, req.body, {
            headers: {
                'Authorization': `Bearer ${req.session.token}`
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ 
            error: error.response?.data?.error || 'Backend error' 
        });
    }
});

app.get('/api/conversations', requireAuth, async (req, res) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/conversations`, {
            headers: {
                'Authorization': `Bearer ${req.session.token}`
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ 
            error: error.response?.data?.error || 'Backend error' 
        });
    }
});

app.get('/api/conversations/:id', requireAuth, async (req, res) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/conversations/${req.params.id}`, {
            headers: {
                'Authorization': `Bearer ${req.session.token}`
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ 
            error: error.response?.data?.error || 'Backend error' 
        });
    }
});

app.delete('/api/conversations/:id', requireAuth, async (req, res) => {
    try {
        const response = await axios.delete(`${BACKEND_URL}/api/conversations/${req.params.id}`, {
            headers: {
                'Authorization': `Bearer ${req.session.token}`
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ 
            error: error.response?.data?.error || 'Backend error' 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Frontend server running on http://localhost:${PORT}`);
    console.log(`Connecting to backend at ${BACKEND_URL}`);
});