const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
    res.render('index', { 
        title: 'Smolagent Framework - Unified AI Assistant',
        backendUrl: BACKEND_URL 
    });
});

// Unified message endpoint
app.post('/api/message', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/message`, {
            message: req.body.message,
            session_id: req.body.session_id
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ 
            error: error.response?.data?.error || 'Backend error' 
        });
    }
});

// Clear history endpoint
app.post('/api/clear', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/clear`, {
            session_id: req.body.session_id
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ 
            error: error.response?.data?.error || 'Backend error' 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Frontend server running on http://localhost:${PORT}`);
    console.log(`Connecting to backend at ${BACKEND_URL}`);
});