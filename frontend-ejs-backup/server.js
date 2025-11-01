const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());

// Session configuration (IMPORTANT!)
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'  // ADD THIS
    },
    name: 'smolagent.sid'  // ADD THIS - custom session cookie name
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('view cache', false);

// Auth middleware
function requireAuth(req, res, next) {
    console.log('Session check:', req.session); // DEBUG
    console.log('Token exists:', !!req.session.token); // DEBUG
    
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

// Page routes
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

app.get('/registration-success', (req, res) => {
  res.render('registration-success', { 
    title: 'Registration Complete' 
  });
});

app.get('/', requireAuth, (req, res) => {
    console.log('Rendering index, user:', req.session.user); // DEBUG
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

// Auth API endpoints
app.post('/api/auth/register', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/auth/register`, req.body);
        
        console.log('Register response:', response.data); // DEBUG
        
        // Store token and user in session
        req.session.token = response.data.token;
        req.session.user = response.data.user;
        
        console.log('Session after register:', req.session); // DEBUG
        
        res.json(response.data);
    } catch (error) {
        console.error('Register error:', error.response?.data); // DEBUG
        res.status(error.response?.status || 500).json({ 
            error: error.response?.data?.error || 'Registration failed' 
        });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/auth/login`, req.body);
        
        console.log('Login response:', response.data); // DEBUG
        
        // Store token and user in session
        req.session.token = response.data.token;
        req.session.user = response.data.user;
        
        console.log('Session after login:', req.session); // DEBUG
        
        res.json(response.data);
    } catch (error) {
        console.error('Login error:', error.response?.data); // DEBUG
        res.status(error.response?.status || 500).json({ 
            error: error.response?.data?.error || 'Login failed' 
        });
    }
});

app.post('/api/auth/check-username', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/auth/check-username`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Check username error:', error.response?.data); // DEBUG
        res.status(error.response?.status || 500).json({ 
            error: error.response?.data?.error || 'Username check failed' 
        });
    }
});

app.post('/api/auth/check-email', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/auth/check-email`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Check email error:', error.response?.data); // DEBUG
        res.status(error.response?.status || 500).json({ 
            error: error.response?.data?.error || 'Email check failed' 
        });
    }
});

// Protected API endpoints
app.post('/api/message', requireAuth, async (req, res) => {
    console.log('Sending message with token:', req.session.token ? 'YES' : 'NO'); // DEBUG
    
    try {
        const response = await axios.post(`${BACKEND_URL}/api/message`, req.body, {
            headers: {
                'Authorization': `Bearer ${req.session.token}`
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Message error:', error.response?.status, error.response?.data); // DEBUG
        
        if (error.response?.status === 401 || error.response?.status === 403) {
            req.session.destroy();
            return res.status(401).json({ error: 'Session expired. Please login again.' });
        }
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

// email route
app.get('/verify-email/:token', (req, res) => {
  res.render('verify-email', { 
    title: 'Verify Email',
    token: req.params.token 
  });
});

// Proxy for /api routes
app.use('/api', createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true
}));

app.listen(PORT, () => {
    console.log(`Frontend server running on http://localhost:${PORT}`);
    console.log(`Connecting to backend at ${BACKEND_URL}`);
});