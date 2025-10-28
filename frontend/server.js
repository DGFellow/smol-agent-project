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
        title: 'Smolagent Framework',
        backendUrl: BACKEND_URL 
    });
});

app.post('/api/chat', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/chat`, {
            prompt: req.body.prompt
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ 
            error: error.response?.data?.error || 'Backend error' 
        });
    }
});

app.post('/api/code', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/code`, {
            task: req.body.task,
            language: req.body.language || 'python'
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ 
            error: error.response?.data?.error || 'Backend error' 
        });
    }
});

app.post('/api/clear', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/clear`, {
            agent_type: req.body.agent_type || 'chat'
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
});